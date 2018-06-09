#!/usr/bin/env python2
# -*- coding: utf-8 -*-

import os
import sys
import json
import argparse
import shutil
import subprocess
import mimetypes
import git
from datetime import datetime

def say(s, *args):
	sys.stderr.write(s.format(*args))

def say_pad(s, pad):
	for l in s.split('\n'):
		if l.strip():
			sys.stderr.write(pad + ' ' + l + '\n')

def get_args():
	parser = argparse.ArgumentParser(formatter_class=argparse.ArgumentDefaultsHelpFormatter)
	parser.add_argument('-r', '--release', action='store_true', help='create GitHub release')
	parser.add_argument('-d', '--deploy', action='store_true', help='deploy built target')
	parser.add_argument('--build-dir', default='./build', metavar='PATH', help='build directory')
	parser.add_argument('target', nargs='?', default='all', help='target to build, one of: ' + ', '.join(sorted(TARGETS)))

	return parser.parse_args()

def merge_json(a, b, out):
	with open(a, 'r') as f:
		ja = json.load(f)

	with open(b, 'r') as f:
		jb = json.load(f)

	ja.update(jb)

	with open(out, 'w') as f:
		json.dump(ja, f, indent=4)

def copy_source(dest_dir):
	if os.path.isdir(dest_dir):
		shutil.rmtree(dest_dir)
	os.makedirs(dest_dir)

	for fname in FILES:
		if os.path.isdir(fname):
			shutil.copytree(fname, os.path.join(dest_dir, fname))
		else:
			shutil.copy2(fname, dest_dir)

def create_browser_dir(build_dir, browser_name):
	browser_dir     = os.path.join(build_dir, browser_name)
	browser_src_dir = os.path.join(browser_dir, 'src')

	say('[Build/{}] Copying sources...\r', browser_name)
	copy_source(browser_src_dir)
	say('[Build/{}] Copying sources... done.\n', browser_name)

	say('[Build/{}] Merging manifest...\r', browser_name)
	merge_json('manifest.json', 'manifest.' + browser_name + '.json', os.path.join(browser_src_dir, 'manifest.json'))
	say('[Build/{}] Merging manifest... done.\n', browser_name)

	return browser_dir, browser_src_dir

def get_artifacts(bdir):
	artifacts = []
	for fname in os.listdir(bdir):
		artifacts.append((fname, mimetypes.guess_type(fname)[0]))

	return artifacts

def build_chrome(build_dir):
	bdir, sdir = create_browser_dir(build_dir, 'chrome')

	say('[Build/chrome] Running web-ext...\r')

	sp = subprocess.Popen(
		['web-ext', 'build', '--source-dir=' + sdir, '--artifacts-dir=' + bdir, '--overwrite-dest'],
		stdout=subprocess.PIPE,
		stderr=subprocess.STDOUT
	)

	out, _ = sp.communicate()

	say_pad(out, '[Build/chrome]')

	if sp.returncode != 0:
		say('[Build/chrome] Warning: web-ext exited with code {}.\n', sp.returncode)

	shutil.rmtree(sdir)

	return get_artifacts(bdir)

def build_firefox(build_dir):
	bdir, sdir = create_browser_dir(build_dir, 'firefox')

	say('[Build/firefox] Running web-ext...\r')

	sp = subprocess.Popen(
		['web-ext', 'build', '--source-dir=' + sdir, '--artifacts-dir=' + bdir, '--overwrite-dest'],
		stdout=subprocess.PIPE,
		stderr=subprocess.STDOUT
	)

	out, _ = sp.communicate()

	say_pad(out, '[Build/firefox]')

	if sp.returncode != 0:
		say('[Build/firefox] Warning: web-ext exited with code {}.\n', sp.returncode)

	shutil.rmtree(sdir)

	return get_artifacts(bdir)

def build(repo, target, build_dir):
	if os.getcwd() == os.path.abspath(build_dir):
			say('[Build] Error: cannot build in source directory.\n')
			exit(1)

	if not os.path.isdir(build_dir):
		try:
			os.makedirs(build_dir)
		except:
			say('[Build] Error: unable to create build directory "{}", aborting.\n', build_dir)
			exit(1)

	built    = []
	tag_name = repo.git.describe('--tags')
	builders = TARGETS.get(target)

	if builders is None:
		say('[Build] Error: unknown target "{}", aborting.\n', target)
		exit(1)

	say('[Build] Target: {}.\n', target)
	say('[Build] Building {} ({}).\n', tag_name, repo.head.commit.hexsha)

	for builder in builders:
		assets = builder(build_dir)
		built.append(assets)

	say('[Build] Done.\n')

	return built

def get_head_tag_name(repo):
	tag_name = repo.git.describe('--tags')

	for tag in repo.tags:
		if tag.name == tag_name:
			return tag_name
	return None

def get_changelog(fname):
	changelog = []
	ok = False

	for l in open(fname, 'r').readlines():
		if ok and (l[:3] == '###' or l[:3] == '---'):
			break

		if l[:3] == '###':
			ok = True

		if ok:
			changelog.append(l)

	h    = changelog[0]
	date = datetime.strptime(h[h.find('(')+1:h.find(')')], '%Y-%m-%d').strftime('%B %d, %Y').replace(' 0', ' ')
	head = date + ' — '
	body = ''.join(changelog[1:]).strip('\n')

	return head + body

def release(repo, assets=[]):
	import github3

	ENV_TOKEN            = os.getenv('GH_OAUTH_TOKEN')
	ENV_RELEASE_BRANCH   = os.getenv('GH_RELEASE_BRANCH')
	ENV_RELEASE_BASENAME = os.getenv('GH_RELEASE_BASENAME')

	ENV_TRAVIS_REPO_SLUG = os.getenv('TRAVIS_REPO_SLUG')
	ENV_TRAVIS_BRANCH    = os.getenv('TRAVIS_BRANCH')
	ENV_TRAVIS_PR        = os.getenv('TRAVIS_PULL_REQUEST')

	if ENV_TRAVIS_PR == '1':
		say('[Release] Skipping release: pull requests.')
		exit(0)

	if not (ENV_TOKEN and ENV_RELEASE_BRANCH and ENV_RELEASE_BASENAME and ENV_TRAVIS_REPO_SLUG and ENV_TRAVIS_BRANCH):
		say('[Release] Error: missing one or more needed environment variables, aborting.\n')
		exit(1)

	tag_name   = get_head_tag_name(repo)

	if ENV_TRAVIS_BRANCH != ENV_RELEASE_BRANCH:
		say('[Release] Skipping release: current branch ({}) is not designed release branch ({}).\n', ENV_TRAVIS_BRANCH, ENV_RELEASE_BRANCH)
		exit(0)

	if tag_name is None:
		say('[Release] Skipping release: HEAD not pointing to a tag.\n')
		exit(0)

	user, repo = ENV_TRAVIS_REPO_SLUG.split('/')
	release_name = ENV_RELEASE_BASENAME + ' ' + tag_name
	release_is_pre = any(s in tag_name for s in ('alpha', 'beta', 'pre'))

	say('[Release] Releasing {}.\n', release_name)

	say('[Release] Parsing changelog...\r')
	release_body = get_changelog('CHANGELOG.md')
	say('[Release] Parsing changelog... done.\n')

	gh_repo    = github3.login(token=ENV_TOKEN).repository(user, repo)
	gh_release = None

	say('[Release] Creating release...\r')

	try:
		gh_release = gh_repo.release_from_tag(tag_name)
		say('[Release] Creating release... already existing.\n')
	except github3.exceptions.NotFoundError:
		gh_release = gh_repo.create_release(tag_name, name=release_name, body=release_body, prerelease=release_is_pre)
		say('[Release] Creating release... done.\n')

	for fname, mimetype in assets:
		say('[Release] Uploading {}...\r', fname)
		gh_release.upload_asset(mimetype, fname, open(fname, 'rb').read())
		say('[Release] Uploading {}... done.\n', fname)

	say('[Release] Done.\n')

def deploy():
	# TODO
	pass

###############################################################

FILES = [
	'LICENSE',
	'CHANGELOG.md',
	'src',
	'resources'
]

TARGETS = {
	'chrome': [build_chrome],
	'firefox': [build_firefox],
	'all': [build_chrome, build_firefox]
}

if __name__ == '__main__':
	args     = get_args()
	git_repo = git.Repo()

	assets = build(git_repo, args.target, args.build_dir)

	if args.release:
		release(git_repo, assets)

	if args.deploy:
		deploy()

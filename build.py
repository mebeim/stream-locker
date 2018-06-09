#!/usr/bin/env python2
# -*- coding: utf-8 -*-

import os
import sys
import zipfile
import json
import argparse
import git
from datetime import datetime

def say(s, *args):
	sys.stderr.write(s.format(*args))

def get_args():
	parser = argparse.ArgumentParser(formatter_class=argparse.ArgumentDefaultsHelpFormatter)
	parser.add_argument('-r', '--release', action='store_true', help='create GitHub release')
	parser.add_argument('-d', '--deploy', action='store_true', help='deploy built target')
	parser.add_argument('--build-dir', default='./build', metavar='PATH', help='build directory')
	parser.add_argument('target', nargs='?', default='all', help='target to build, one of: ' + ', '.join(sorted(TARGETS)))

	return parser.parse_args()

def zip_add(z, path):
	if os.path.isdir(path):
		for root, _, files in os.walk(path):
			for file in files:
				z.write(os.path.join(root, file), os.path.relpath(os.path.join(root, file), os.path.join(path, '..')))
	else:
		z.write(path)

def zip_create(fname):
	z = zipfile.ZipFile(fname, 'w', zipfile.ZIP_DEFLATED)
	zip_add(z, 'src')
	zip_add(z, 'resources')
	zip_add(z, 'LICENSE')
	zip_add(z, 'CHANGELOG.md')

	return z

def merge_json(a, b):
	ja = json.load(open(a, 'r'))
	jb = json.load(open(b, 'r'))
	ja.update(jb)

	return json.dumps(ja, separators=(',', ':'))

def build(repo, target, build_dir):
	if not os.path.isdir(build_dir):
		try:
			os.mkdir(build_dir)
		except:
			say('[Build] Error: unable to create build directory "{}", aborting.\n', build_dir)
			exit(1)

	built    = []
	tag_name = repo.git.describe('--tags')
	browsers = TARGETS.get(target)

	if browsers is None:
		say('[Build] Error: unknown target "{}", aborting.\n', target)
		exit(1)

	say('[Build] Target: {}.\n', target)
	say('[Build] Building {} ({}).\n', tag_name, repo.head.commit.hexsha)

	for browser in browsers:
		zip_fname      = os.path.join(build_dir, tag_name + '_' + browser + '.zip')
		manifest_fname = 'manifest.' + browser + '.json'

		say('[Build] Browser: {}.\n', browser)
		say('[Build] Creating ZIP: adding files...\r')

		zip_file = zip_create(zip_fname)

		say('[Build] Creating ZIP: adding manifest...\r')

		if os.path.isfile(manifest_fname):
			zip_file.writestr('manifest.json', merge_json('manifest.json', manifest_fname))
		else:
			zip_add(zip_file, 'manifest.json')

		say('[Build] Creating ZIP: done ({}).\n', zip_fname)
		zip_file.close()

		built.append((zip_fname, 'application/zip'))

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
		gh_release.upload_asset(mimetype, os.path.split(fname)[-1], open(fname, 'rb').read())
		say('[Release] Uploading {}... done.\n', fname)

	say('[Release] Done.\n')

def deploy():
	# TODO
	pass

###############################################################

TARGETS = {
	'chrome': ['chrome'],
	'firefox': ['firefox'],
	'all': ['chrome', 'firefox']
}

if __name__ == '__main__':
	args     = get_args()
	git_repo = git.Repo()

	assets = build(git_repo, args.target, args.build_dir)

	if args.release:
		release(git_repo, assets)

	if args.deploy:
		deploy()
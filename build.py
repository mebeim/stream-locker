#!/usr/bin/env python2
# -*- coding: utf-8 -*-

import os
import sys
import json
import argparse
import shutil
import subprocess
import mimetypes
import re
import git
from datetime import datetime

def say(s, *args):
	sys.stderr.write(s.format(*args))

def get_args():
	parser = argparse.ArgumentParser(formatter_class=argparse.ArgumentDefaultsHelpFormatter)
	parser.add_argument('--release', action='store_true', help='create GitHub release')
	parser.add_argument('--deploy', action='store_true', help='deploy extensions')
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

def get_browser_dirs(build_dir, browser_name):
	browser_dir     = os.path.join(build_dir, browser_name)
	browser_src_dir = os.path.join(browser_dir, 'src')

	return browser_dir, browser_src_dir

def create_browser_dirs(build_dir, browser_name):
	bdir, sdir = get_browser_dirs(build_dir, browser_name)

	if os.path.isdir(bdir):
		shutil.rmtree(bdir)

	say('[Build/{}] Copying sources...\r', browser_name)
	copy_source(sdir)
	say('[Build/{}] Copying sources... done.\n', browser_name)

	say('[Build/{}] Merging manifest...\r', browser_name)
	merge_json('manifest.json', 'manifest.' + browser_name + '.json', os.path.join(sdir, 'manifest.json'))
	say('[Build/{}] Merging manifest... done.\n', browser_name)

	return bdir, sdir

def web_ext_build(bdir, sdir, browser_name):
	say('[Build/{}] Running web-ext build...\r', browser_name)

	sp = subprocess.Popen(
		['web-ext', 'build', '--source-dir=' + sdir, '--artifacts-dir=' + bdir, '--overwrite-dest'],
		stdout=subprocess.PIPE,
		stderr=subprocess.STDOUT
	)

	out = sp.communicate()[0]

	say("[Build/{}] Building extension with 'web-ext build'...\r", browser_name)

	if sp.returncode == 0:
		say("[Build/{}] Building extension with 'web-ext build'... done\n", browser_name)
	else:
		say("[Build/{}] Error: 'web-ext build' exited with code {}, aborting.\n\n", browser_name, sp.returncode)
		say(out)
		exit(1)

	say('[Build/{}] Done.\n', browser_name)

def web_ext_sign(bdir, sdir, browser_name):
	if not (ENV_AMO_JWT_ISSUER and ENV_AMO_JWT_SECRET):
		say('[Deploy/{}] Error: missing one or more needed environment variables, aborting.\n', browser_name)
		exit(1)

	say("[Deploy/{}] Signing extension with 'web-ext sign'...\r", browser_name)

	sp = subprocess.Popen(
		[
			'web-ext', 'sign',
			'--api-key=' + ENV_AMO_JWT_ISSUER,
			'--api-secret=' + ENV_AMO_JWT_SECRET,
			'--source-dir=' + sdir,
			'--artifacts-dir=' + bdir
		],
		stdout=subprocess.PIPE,
		stderr=subprocess.STDOUT
	)

	out = sp.communicate()[0]

	if sp.returncode != 0 and 'Version already exists' in out:
		say("[Deploy/{}] Signing extension with 'web-ext sign'... version already signed.\n", browser_name)
	elif sp.returncode == 0:
		say("[Deploy/{}] Signing extension with 'web-ext sign'... done.\n", browser_name)
	else:
		say("[Deploy/{}] Error: 'web-ext sign' exited with code {}, aborting.\n\n", browser_name, sp.returncode)
		say(out)
		exit(1)

	say('[Deploy/{}] Done.\n', browser_name)

def build_chrome(build_dir):
	bdir, sdir = create_browser_dirs(build_dir, 'chrome')
	web_ext_build(bdir, sdir, 'chrome')

def build_firefox(build_dir):
	bdir, sdir = create_browser_dirs(build_dir, 'firefox')
	web_ext_build(bdir, sdir, 'firefox')

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

	tag_name = repo.git.describe('--tags')

	if target not in TARGETS.keys():
		say('[Build] Error: unknown target "{}", aborting.\n', target)
		exit(1)

	say('[Build] Target: {}.\n', target)
	say('[Build] Building {} ({}).\n', tag_name, repo.head.commit.hexsha)

	for builder in TARGETS[target]['build']:
		builder(build_dir)

	say('[Build] Done.\n')

def deploy_chrome(_):
	say("[Deploy/chrome] Unfortunately Google doesn't like automatic deployment :(\n")
	say('[Deploy/chrome] Done.\n')

def deploy_firefox(build_dir):
	bdir, sdir = get_browser_dirs(build_dir, 'firefox')
	web_ext_sign(bdir, sdir, 'firefox')

def deploy(target, build_dir, tag_name):
	if tag_name[-4:] == '-pre':
		say('[Deploy] Pre release, skipping deploy.\n')
		return

	if target not in TARGETS.keys():
		say('[Deploy] Error: unknown target "{}", aborting.\n', target)
		exit(1)

	say('[Deploy] Target: {}.\n', target)

	for deployer in TARGETS[target]['deploy']:
		deployer(build_dir)

def clean_build_dir(build_dir):
	for target in filter(lambda k: k != 'all', TARGETS.keys()):
		_, sdir = get_browser_dirs(build_dir, target)

		if os.path.isdir(sdir):
			shutil.rmtree(sdir)

def rename_assets(build_dir):
	for target in filter(lambda k: k != 'all', TARGETS.keys()):
		bdir = get_browser_dirs(build_dir, target)[0]

		if os.path.isdir(bdir):
			for fname in os.listdir(bdir):
				ext        = fname[fname.rfind('.'):]
				clean_name = re.sub(r'([\w_]+-(\d+\.)+\d).*', r'\1', fname)
				newfname   = clean_name + '-' + target + ext

				os.rename(os.path.join(bdir, fname),  os.path.join(bdir, newfname))

def get_assets(build_dir, deployed):
	say('[Release] Gathering assets...\r')

	assets = []

	for target in filter(lambda k: k != 'all', TARGETS.keys()):
		bdir = get_browser_dirs(build_dir, target)[0]

		if os.path.isdir(bdir):
			for fname in os.listdir(bdir):
				fullname = os.path.join(bdir, fname)
				assets.append((fullname, mimetypes.guess_type(fullname)[0]))

	if len(assets):
		say('[Release] Gathering assets... done ({} found).\n', len(assets))
	else:
		say('[Release] Gathering assets... no assets found.\n')

	return assets

def get_head_tag_name(repo):
	tag_name = repo.git.describe('--tags')

	for tag in repo.tags:
		if tag.name == tag_name:
			return tag_name
	return None

def check_releasable(tag_name):
	if not (ENV_GH_TOKEN and ENV_GH_RELEASE_BASENAME and ENV_GH_RELEASE_BRANCH and ENV_TRAVIS_REPO_SLUG and ENV_TRAVIS_BRANCH and ENV_TRAVIS_PR):
		say('[Release] Error: missing one or more needed environment variables, aborting.\n')
		exit(1)

	if ENV_TRAVIS_PR == '1':
		say('[Release] Skipping release: this is a pull request.')
		exit(0)

	if ENV_TRAVIS_BRANCH != ENV_GH_RELEASE_BRANCH:
		say('[Release] Skipping release: current branch ({}) is not designed release branch ({}).\n', ENV_TRAVIS_BRANCH, ENV_GH_RELEASE_BRANCH)
		exit(0)

	if tag_name is None:
		say('[Release] Skipping release: HEAD not pointing to a tag.\n')
		exit(0)

def get_changelog(fname):
	changelog = []
	ok = False

	for l in map(str.strip, open(fname, 'r').readlines()):
		if ok and (l[:3] == '###' or l[:3] == '---'):
			break

		if l[:3] == '###':
			ok = True

		if ok:
			changelog.append(l)

	h    = changelog.pop(0)
	date = datetime.strptime(h[h.find('(')+1:h.find(')')], '%Y-%m-%d').strftime('%B %d, %Y').replace(' 0', ' ')

	while not changelog[0]:
		changelog.pop(0)

	head = date + ' — ' + '**' + changelog[0] + '**'
	body = '\n'.join(changelog[1:]).strip('\n')

	return head + '\n\n' + body

def release_create(tag_name):
	import github3

	check_releasable(tag_name)

	user, repo = ENV_TRAVIS_REPO_SLUG.split('/')
	release_name = ENV_GH_RELEASE_BASENAME + ' ' + tag_name
	release_is_pre = any(s in tag_name for s in ('alpha', 'beta', 'pre'))

	say('[Release] Releasing {}.\n', release_name)

	say('[Release] Parsing changelog...\r')
	release_body = get_changelog('CHANGELOG.md')
	say('[Release] Parsing changelog... done.\n')

	gh_repo    = github3.login(token=ENV_GH_TOKEN).repository(user, repo)
	gh_release = None

	say('[Release] Creating release...\r')

	try:
		gh_release = gh_repo.release_from_tag(tag_name)
		say('[Release] Creating release... already existing.\n')
	except github3.exceptions.NotFoundError:
		gh_release = gh_repo.create_release(tag_name, name=release_name, body=release_body, prerelease=release_is_pre)
		say('[Release] Creating release... done.\n')

	return gh_release

def release_upload_assets(gh_release, assets):
	for fname, mimetype in assets:
		say('[Release/upload] Uploading {}...\r', fname)
		gh_release.upload_asset(mimetype, os.path.split(fname)[-1], open(fname, 'rb').read())
		say('[Release/upload] Uploading {}... done.\n', fname)

	say('[Release] Done.\n')

###############################################################

FILES = [
	'LICENSE',
	'CHANGELOG.md',
	'src',
	'resources'
]

TARGETS = {
	'chrome': {
		'build': [build_chrome],
		'deploy': [deploy_chrome]
	},
	'firefox': {
		'build': [build_firefox],
		'deploy': [deploy_firefox]
	},
	'all': {
		'build': [build_chrome, build_firefox],
		'deploy': [deploy_chrome, deploy_firefox]
	},
}

if __name__ == '__main__':
	ENV_GH_TOKEN            = os.getenv('GH_OAUTH_TOKEN')
	ENV_GH_RELEASE_BASENAME = os.getenv('GH_RELEASE_BASENAME')
	ENV_GH_RELEASE_BRANCH   = os.getenv('GH_RELEASE_BRANCH')

	ENV_AMO_JWT_ISSUER      = os.getenv('AMO_JWT_ISSUER')
	ENV_AMO_JWT_SECRET      = os.getenv('AMO_JWT_SECRET')

	ENV_TRAVIS_BRANCH       = os.getenv('TRAVIS_BRANCH')
	ENV_TRAVIS_PR           = os.getenv('TRAVIS_PULL_REQUEST')
	ENV_TRAVIS_REPO_SLUG    = os.getenv('TRAVIS_REPO_SLUG')

	args       = get_args()
	git_repo   = git.Repo()
	gh_release = None

	build(git_repo, args.target, args.build_dir)
	tag_name = get_head_tag_name(git_repo)

	if args.release:
		gh_release = release_create(tag_name)

	if args.deploy:
		deploy(args.target, args.build_dir, tag_name)

	clean_build_dir(args.build_dir)
	rename_assets(args.build_dir)

	if args.release:
		assets = get_assets(args.build_dir, args.deploy)
		release_upload_assets(gh_release, assets)

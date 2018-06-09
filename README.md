![Logo][logo-img] Stream Locker
===============================

[![License: GPL v3][license-img]][license-link]
[![Travis-CI build][travis-img]][travis-link]
[![Chrome Web Store][chrome-img]][chrome-link]
[![Firefox Add-on][firefox-img]][firefox-link]

Stream Locker helps you avoid the pain of watching videos in sites with clumsy players you're not familiar with and full of annoying ads and popups. Whenever you visit a blacklisted streaming site, as soon as you get to the video, it is captured by Stream Locker and loaded in the lightweight native HTML5 player of your browser, full size, in a new page without any additional element but the player, and with a set of intuitive keyboard shortcuts to play, pause, fast-forward, change volume, etc. In addition to this, any popup on blacklisted sites is automatically blocked. Try Stream Locker out, and you'll never want to watch another stream online without it!

As of now, sites are blacklisted using a silly `blacklist.txt` file, which can be easily manually modified if the extension is installed from source. In the near future, the blacklist will be fully manageable through the extension's options.

### Player keyboard/mouse shortcuts

 - <kbd>space</kbd> or *mouse left click*: play/pause.
 - <kbd>F</kbd> or *mouse double left click*: toggle full screen.
 - <kbd>+</kbd> or *mouse scroll up*: volume +5%.
 - <kbd>-</kbd> or *mouse scroll down*: volume -5%.
 - <kbd>→</kbd>: skip forward 10 seconds.
 - <kbd>←</kbd>: skip backward 10 seconds.
 - <kbd>↑</kbd>: skip forward 30 seconds.
 - <kbd>↓</kbd>: skip backward 30 seconds.

Installation
------------

### From the store

Simply visit the **[Chrome Web Store page][chrome-link]** or the **[Firefox Add-ons store page][firefox-link]** and install in one click.

### Frome source

Feel free to install any version of the extension from source. You can either check the **available [releases][1]** or clone the repo and build it yourself (see how in the next section).

If you're bothering with this I'm going assume you know what you're doing. I mean, you obviously know that installing from source is possible dragging and dropping the extension's `.zip` file in `chrome://extensions` (for Chrome) or `about:debugging` (for Firefox), right?. You probably also already know that installing from unsigned source will make your browser complain, but if you want to have fun, go ahead!

Building
--------

Building requires [Python 2.7][2], [`GitPython`][3] and [`web-ext`][4].

	$ pip install GitPython
	$ npm install -g web-ext

Just clone this repo and build running the `build.py` script.

	$ git clone https://github.com/mebeim/stream-locker.git
	$ cd stream-locker
	$ ./build.py

You can also specify a custom build directory with `--build-dir` and a custom target browser (e.g. `chrome` or `firefox`). By default, the build directory is `./build`, and the target is `all`, which builds all the targets.

Don't bother with the `--release` and `--deploy` options, They're only there for me to automate releases and deployment, and also need a bunch of environment variables to work, including secret API tokens which obviously you don't have.

------------------------------------------------------------------------------------------

*Copyright &copy; 2017 Marco Bonelli. Licensed under the GNU General Public License v3.0.*

 [1]: https://github.com/mebeim/stream-locker/releases
 [2]: https://www.python.org/
 [3]: https://github.com/gitpython-developers/GitPython
 [4]: https://github.com/mozilla/web-ext

 [logo-img]:     https://raw.githubusercontent.com/mebeim/stream-locker/master/resources/images/icons/38.png
 [license-img]:  https://img.shields.io/badge/License-GPL%20v3-blue.svg
 [license-link]: https://www.gnu.org/licenses/gpl-3.0
 [travis-img]:   https://travis-ci.com/mebeim/stream-locker.svg?branch=master
 [travis-link]:  https://travis-ci.com/mebeim/stream-locker
 [chrome-img]:   https://img.shields.io/chrome-web-store/v/dendgcjgnbappncfobbbocpkcahhkajm.svg
 [chrome-link]:  https://chrome.google.com/webstore/detail/stream-locker/dendgcjgnbappncfobbbocpkcahhkajm
 [firefox-img]:  https://img.shields.io/amo/v/stream-locker.svg
 [firefox-link]: https://addons.mozilla.org/en-US/firefox/addon/stream-locker/

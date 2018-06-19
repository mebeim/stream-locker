Stream Locker Changelog
=======================

Versions
--------

### [1.0.0][v1.0.0] — 2018-06-18

Complete and working!

First stable version of Stream Locker, finally fully customizable and working.

 - Fully working options page to customize blacklist and global options.
 - Removed useless built-in blacklist, now you chose which sites to blacklist.
 - Added option to choose whether to capture videos in the native player or not.
 - Removed pre-release option of opening player in new tab since it doesn't make much sense.

Developer notes:

 - Screenshots will soon be added to the relative extension store pages.
 - Working on synchronized storage and options backup/restore.

### [0.1.1][v0.1.1-beta] (beta) — 2018-06-10

Published!

 - Published to the Firefox Add-ons Store.
 - Published to the Chrome Web Store.

Solved issues:

 - Installing is now easy-peasy.
 - It turned out that the play/pause keyboard shortcut works correctly on Firefox.

Developer notes:

Integrated automatic build/realease/deploy script, the extension is now easily buildable by anyone. Firefox Add-ons Store deployment is automatic from Travis-CI, while Chrome Web Store deployment requires manual OAuth with expiring token, so unfortunately it can't be automated. Packaged assets will be manually added (if I figure out it makes sense adding them).

### [0.1.0][v0.1.0] (alpha) — 2018-06-06

Welcome to Beta.

 - Mozilla Firefox support (though still not permanent install).
 - Finally implemented a reliable solution for pupup detection and blocking.
 - Code style reformat to ES6.
 - Added some sites to blacklist.

Known issues:

 - Installing on Firefox is still not as easy as in Chrome. The extension doesn't have an ID and is not signed yet so the only option is to manually install it as temporary add-on from `about:debugging`. Sorry about that, still getting the hang of it.
 - On Firefox, the <kbd>space</kbd> key doesn't work for playing/pausing. I have no clue why, since the event is correctly detected and the `.play()` method is correctly called, but whatever, I'll figure it out in some next version.

### [0.0.5][v0.0.5] (alpha) — 2018-04-28

Moving towards something usable!

 - Re-engineered popup-blocking logic.
 - Added a `pageAction` to let the user know when and where the extension is working.
 - Added keyboard shortcuts for volume up/down.
 - Added some sites to blacklist.

### [0.0.4][v0.0.4] (alpha) — 2017-07-08

First public release.

 - Added fullscreen toggle via F key and mouse hide on idle.
 - Player now remembers last volume set.
 - Fixed a bug where any tab was closed if opened when viewing a blacklisted site.
 - Added some sites to blacklist.
 - Edited request filters for new updated `media` type, minimum Chrome version required: `58.0.3029.110`.

### 0.0.3 (alpha) — 2017-01-07

 - Added support for thevideo.me, vidbabc.com, and streamin.to.
 - Removed video_extensions list, useless.
 - Added seek time control through keyboard arrow keys.
 - Player page title is now the same as the original page.
 - Faster pupup tab close.

### 0.0.2 (alpha) — 2016-12-22

 - Added fullscreen on double-click.
 - Added mousewheel volume control.

### 0.0.1 (alpha) — 2016-12-19

 - First alpha version!

------------------------------------------------------------------------------------------
*Copyright &copy; 2017 Marco Bonelli. Licensed under the GNU General Public License v3.0.*

 [v1.0.0]: https://github.com/mebeim/stream-locker/releases/tag/v1.0.0
 [v0.1.1-beta]: https://github.com/mebeim/stream-locker/releases/tag/v0.1.1-beta
 [v0.1.0]: https://github.com/mebeim/stream-locker/releases/tag/v0.1.0
 [v0.0.5]: https://github.com/mebeim/stream-locker/releases/tag/v0.0.5
 [v0.0.4]: https://github.com/mebeim/stream-locker/releases/tag/v0.0.4

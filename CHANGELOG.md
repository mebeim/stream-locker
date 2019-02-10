Stream Locker Changelog
=======================

Versions
--------

### [1.0.4][v1.0.4] — 2019-02-10

Bug fixes, boring stuff.

 - Fixed a bug that sometimes caused the options page to not correctly display right after installing the extension.

### [1.0.3][v1.0.3] — 2018-12-13

New option, performance improvements and style fixes.

 - Added advanced option to choose minimum duration of videos to capture (default 10m). Shorter videos will not be captured by the extension.
 - Added advanced options section in options page.
 - Improved tab checking: only check when needed.
 - Fixed options page blacklist alignment.

Developer notes:

 - Still working on screenshots, ugh. It will probably take forever to find something that makes sense.
 - Personal advice to anyone who did not switch back to the old player style on Chrome: do your eyes a favor and go to `chrome://flags/#enable-modern-media-controls` to disable the new awful media controls.

### [1.0.2][v1.0.2] — 2018-09-19

Small improvements and fixes.

 - Global "Extension enabled" option now fully disables the extension if set to "OFF".
 - Sites can now either be "enabled" or "disabled", no more "default" for this value.
 - Made input fields in the options page easier to use.
 - The extension now correctly recognizes newly added and removed sites which already loaded without having to reload their tabs.
 - Extension's description has been updated.
 - Minor style and bug fixes in the options page.

Developer notes:

Looks like FireFox doesn't support `word-break: break-word`. Also, there may be a bug with the way `contenteditable` elements are handled, the caret is sometimes placed in a strange position.

### [1.0.1][v1.0.1] — 2018-07-13

Bug fixes.

 - Fixed fullscreen keyboard/mouse shortcuts not working on Chrome.

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

Integrated automatic build/release/deploy script, the extension is now easily buildable by anyone. Firefox Add-ons Store deployment is automatic from Travis-CI, while Chrome Web Store deployment requires manual OAuth with expiring token, so unfortunately it can't be automated. Packaged assets will be manually added (if I figure out it makes sense adding them).

### [0.1.0][v0.1.0] (alpha) — 2018-06-06

Welcome to Beta.

 - Mozilla Firefox support (though still not permanent install).
 - Finally implemented a reliable solution for popup detection and blocking.
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
 - Faster popup tab close.

### 0.0.2 (alpha) — 2016-12-22

 - Added fullscreen on double-click.
 - Added mousewheel volume control.

### 0.0.1 (alpha) — 2016-12-19

 - First alpha version!

------------------------------------------------------------------------------------------
*Copyright &copy; 2017 Marco Bonelli. Licensed under the GNU General Public License v3.0.*

 [v1.0.4]: https://github.com/mebeim/stream-locker/releases/tag/v1.0.4
 [v1.0.3]: https://github.com/mebeim/stream-locker/releases/tag/v1.0.3
 [v1.0.2]: https://github.com/mebeim/stream-locker/releases/tag/v1.0.2
 [v1.0.1]: https://github.com/mebeim/stream-locker/releases/tag/v1.0.1
 [v1.0.0]: https://github.com/mebeim/stream-locker/releases/tag/v1.0.0
 [v0.1.1-beta]: https://github.com/mebeim/stream-locker/releases/tag/v0.1.1-beta
 [v0.1.0]: https://github.com/mebeim/stream-locker/releases/tag/v0.1.0
 [v0.0.5]: https://github.com/mebeim/stream-locker/releases/tag/v0.0.5
 [v0.0.4]: https://github.com/mebeim/stream-locker/releases/tag/v0.0.4

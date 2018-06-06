![logo][1] Stream Locker
========================

This extension blocks annoying popups on streaming sites and intercepts media webrequests to capture compatible video sources and display them in the lightweight default HTML5 player of your browser. As of now, sites are blacklisted using the `blacklist.txt` file, which can be easily manually modified to add/remove sites without the need to reinstall or update the extension. In the future, the blacklist will be fully manageable through the extension's options. I coded this extension just for fun and I'm using it regularly, but I'm currently not interested in publishing it.

Installation
------------

To install Stream Locker **check the available [releases][2]**.

### Chrome

Navigate to `chrome://extensions` and drag and drop the packaged `.crx` file in the page. You can also enable "developer mode" and click on "Load unpacked extension" selecting the folder containing the extension source.

**Please note** taht developer mode extensions (not installed from the store, like this one) will cause Chrome to raise a warning at startup recommending to disable them. A workaround to hide this annoying message (at least on Windows) can be found [here][3].

### Firefox

Navigate to `about:debugging`, and click on "Load Temporary Add-on". Next, either select the `.zip` file or the `manifest.json` in the folder containing the extension source.

**Please note** that since this extension is not already published nor signed, it doesn't have an add-on ID, and cannot be installed permanently. I'm planning on doing it in the near future.

Player keyboard/mouse shortcuts
-------------------------------

 - <kbd>space</kbd> or *mouse left click*: play/pause.
 - <kbd>F</kbd> or *mouse double left click*: toggle full screen.
 - <kbd>+</kbd> or *mouse scroll up*: volume +5%.
 - <kbd>-</kbd> or *mouse scroll down*: volume -5%.
 - <kbd>→</kbd>: skip forward 10 seconds.
 - <kbd>←</kbd>: skip backward 10 seconds.
 - <kbd>↑</kbd>: skip forward 30 seconds.
 - <kbd>↓</kbd>: skip backward 30 seconds.

----------------------------------------------------------------------------------------

*Copyright &copy; 2017 Marco Bonelli. Licensed under the GNU General Public License v3.0.*

 [1]: https://github.com/mebeim/stream-locker/raw/master/images/icons/38.png
 [2]: https://github.com/mebeim/stream-locker/releases
 [3]: https://stackoverflow.com/questions/30287907

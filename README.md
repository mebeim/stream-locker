Stream Locker
=============

This extension blocks annoying popups on streaming sites and intercepts media webrequests to capture compatible video sources and display them in the lightweight default Google Chrome's HTML5 player. The `blacklist.txt` file can be easily modified to add/remove sites without the need to reinstall or update the extension. I coded this extension just for fun and I'm using it regularly, but I'm currently not interested in publishing it to the Chrome Web Store.

Installation
------------

To install Stream Locker **check the available [releases][1]**, which provide a packaged `.crx` file which can be dragged and dropped int your `chrome://extensions` page to manually install the extension. You can also install Stream Locker from the same page by checking the checkbox "develoepr mode", then choosing "Load unpacked extension" and selecting the folder containing the extension source.

**Please note** taht developer mode extensions (not installed from the store, like this one) will cause Chrome to raise a warning at startup recommending to disable them. A workaround to hide this annoying message can be found [here][2].


Player keyboard/mouse shortcuts
-------------------------------

 - **Spacebar**: play/pause.
 - **F**: toggle full screen.
 - **Right arrow**: skip forward 10 seconds.
 - **Left arrow**: skip backward 10 seconds.
 - **Up arrow**: skip forward 30 seconds.
 - **Down arrow**: skip backward 30 seconds.
 - **Mouse left click**: play/pause.
 - **Mouse double click**: toggle full screen.
 - **Mouse wheel scroll Up**: volume +5%.
 - **Mouse wheel scroll Down**: volume -5%.


 [1]: https://github.com/mebeim/stream-locker/releases
 [2]: https://stackoverflow.com/questions/30287907
mergeInto(LibraryManager.library, {
  BlackCube_NotifyJS: function(ptr) {
    var str = UTF8ToString(ptr);
    try {
      if (typeof window.ReceiveUnityBlackCube === 'function') {
        window.ReceiveUnityBlackCube(str);
      } else {
        // store it for later if receiver isn't ready yet
        window._lastUnityBlackCube = str;
      }
    } catch (e) {
      console.warn('BlackCube_NotifyJS error', e, str);
    }
  }
});

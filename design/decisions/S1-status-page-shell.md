# S1: the status page has a full-height reading shell

Aaron's call, 17 November 2026: remove the bottom player and rebuild the broken status-page layout. The sidebar must extend to the bottom of the viewport.

The page keeps its existing visual identity and status content. Its body is a viewport-height grid with an automatically sized header and a remaining-height main area. The sidebar and article scroll independently; neither relies on a hard-coded header height. The default body margin and all player markup, speech code and reserved footer space are removed. Below 700 pixels, a Pages button reveals the navigation; choosing a page or pressing Escape closes it. Hash navigation resets the article's own scroll position and preserves keyboard access to content.

Verified in a real browser: at 1280 by 900, the sidebar and article both end at pixel 900 beneath the 64-pixel header. At 900 by 600, the final sidebar link remains reachable and both areas scroll independently. All twelve sections have no article-level horizontal overflow on desktop and 390-pixel mobile; the 320-pixel mobile layout also fits. Mobile selection closes navigation, moves focus to the article and resets its scroll; Escape closes the menu and returns focus to its button. The player is absent. JavaScript syntax and the layout scan pass. The status-content definitions were preserved byte for byte.

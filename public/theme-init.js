(function () {
    try {
        var root = document.documentElement;
        var animationMode = localStorage.getItem('animation-mode');
        var themeMode = localStorage.getItem('theme');
        var themeColor = localStorage.getItem('theme-color');
        var systemDark =
            typeof matchMedia === 'function' &&
            matchMedia('(prefers-color-scheme: dark)').matches;
        var resolvedTheme =
            themeMode === 'dark' || (themeMode !== 'light' && systemDark)
                ? 'dark'
                : 'light';

        root.dataset.animationMode =
            animationMode === 'skip' ? 'skip' : 'normal';
        root.dataset.theme = resolvedTheme;
        root.dataset.themeMode =
            themeMode === 'light' || themeMode === 'dark'
                ? themeMode
                : 'system';
        root.style.colorScheme = resolvedTheme;

        if (themeColor === 'azure') {
            root.dataset.themeColor = 'azure';
        }
    } catch {}
})();

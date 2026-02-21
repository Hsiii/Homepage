(() => {
    const root = document.documentElement;

    try {
        const savedTheme = localStorage.getItem('theme');
        const isDark =
            savedTheme === 'dark' ||
            (savedTheme === null &&
                matchMedia('(prefers-color-scheme: dark)').matches);

        root.dataset.theme = isDark ? 'dark' : 'light';
        root.style.colorScheme = isDark ? 'dark' : 'light';
    } catch {
        root.dataset.theme = 'light';
        root.style.colorScheme = 'light';
    }
})();

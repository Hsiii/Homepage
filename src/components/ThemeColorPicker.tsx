import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Palette } from 'lucide-react';

const themeColorStorageKey = 'theme-color';
const defaultThemeColor = 'amethyst';

const themeColorOptions = [
    {
        label: 'Amethyst',
        value: 'amethyst',
    },
    {
        label: 'Azure',
        value: 'azure',
    },
] as const;

type ThemeColor = (typeof themeColorOptions)[number]['value'];

const isThemeColor = (value: string | null): value is ThemeColor =>
    themeColorOptions.some((option) => option.value === value);

const applyThemeColor = (themeColor: ThemeColor) => {
    const root = globalThis.document.documentElement;

    if (themeColor === defaultThemeColor) {
        delete root.dataset.themeColor;
        globalThis.localStorage.removeItem(themeColorStorageKey);
        return;
    }

    root.dataset.themeColor = themeColor;
    globalThis.localStorage.setItem(themeColorStorageKey, themeColor);
};

export const ThemeColorPicker: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedThemeColor, setSelectedThemeColor] = useState<ThemeColor>(
        () => {
            const savedThemeColor =
                globalThis.localStorage.getItem(themeColorStorageKey);

            return isThemeColor(savedThemeColor)
                ? savedThemeColor
                : defaultThemeColor;
        }
    );
    const colorPickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onClickOutside = (e: MouseEvent) => {
            if (
                isOpen &&
                colorPickerRef.current?.contains(e.target as Node) === false
            ) {
                setIsOpen(false);
            }
        };

        globalThis.document.addEventListener('click', onClickOutside);
        return () => {
            globalThis.document.removeEventListener('click', onClickOutside);
        };
    }, [isOpen]);

    const selectThemeColor = useCallback((themeColor: ThemeColor) => {
        applyThemeColor(themeColor);
        setSelectedThemeColor(themeColor);
        setIsOpen(false);
    }, []);

    return (
        <div
            className={`theme-color-control ${isOpen ? 'open' : ''}`}
            ref={colorPickerRef}
        >
            <button
                className='theme-icon-btn'
                aria-label='Pick theme color'
                title='Pick theme color'
                aria-expanded={isOpen}
                onClick={(event) => {
                    event.stopPropagation();
                    setIsOpen(!isOpen);
                }}
            >
                <Palette className='icon' />
            </button>
            <div className='theme-color-menu' role='menu'>
                {themeColorOptions.map((option) => (
                    <button
                        className={[
                            'theme-color-option',
                            `theme-color-option-${option.value}`,
                            selectedThemeColor === option.value && 'selected',
                        ]
                            .filter(Boolean)
                            .join(' ')}
                        key={option.value}
                        type='button'
                        role='menuitemradio'
                        aria-checked={selectedThemeColor === option.value}
                        aria-label={`${option.label} theme color`}
                        title={option.label}
                        onClick={(event) => {
                            event.stopPropagation();
                            selectThemeColor(option.value);
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

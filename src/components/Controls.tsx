import React from 'react';

import { AnimationToggle } from './AnimationToggle';
import { Help } from './Help';
import { ThemeColorPicker } from './ThemeColorPicker';
import { ThemeToggle } from './ThemeToggle';

import './Controls.css';

export const Controls: React.FC = () => (
    <div className='controls'>
        <div className='controls-actions'>
            <ThemeToggle />
            <ThemeColorPicker />
            <AnimationToggle />
            <Help />
        </div>
    </div>
);

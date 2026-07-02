import React from 'react';
import { PanelLeft, PanelLeftClose } from 'lucide-react';

import { UserFloatingBar } from './UserFloatingBar';

interface ControlsProps {
    isClerkEnabled: boolean;
    isLinkPanelLocked: boolean;
    onToggleLinkPanelLocked: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
    isClerkEnabled,
    isLinkPanelLocked,
    onToggleLinkPanelLocked,
}) => (
    <>
        <div className='panel-lock-control'>
            <button
                className='panel-lock-trigger'
                type='button'
                aria-label={
                    isLinkPanelLocked
                        ? 'Unlock bookmark panel'
                        : 'Lock bookmark panel open'
                }
                aria-pressed={isLinkPanelLocked}
                onClick={onToggleLinkPanelLocked}
            >
                {isLinkPanelLocked ? (
                    <PanelLeftClose className='icon' size={20} />
                ) : (
                    <PanelLeft className='icon' size={20} />
                )}
            </button>
        </div>
        <UserFloatingBar isClerkEnabled={isClerkEnabled} />
    </>
);

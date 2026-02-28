import backSrc from '../assets/images/mountain/back.svg';
import frontSrc from '../assets/images/mountain/front.svg';
import midSrc from '../assets/images/mountain/mid.svg';

import 'components/Mountains.css';

export const Mountains: React.FC = () => (
    <div className='mountains'>
        <img
            className='parallax-back'
            src={backSrc}
            loading='eager'
            decoding='async'
            fetchPriority='low'
            alt='a flat-color mountain in the background'
        />
        <img
            className='parallax-mid'
            src={midSrc}
            loading='eager'
            decoding='async'
            fetchPriority='low'
            alt='a flat-color mountain in the middle'
        />
        <img
            src={frontSrc}
            loading='eager'
            decoding='async'
            fetchPriority='high'
            alt='a flat-color mountain in the foreground'
        />
    </div>
);

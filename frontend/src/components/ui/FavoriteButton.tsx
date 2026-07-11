import React from 'react';
import { useAppStore } from '../../stores/useAppStore';

interface Props {
  type: 'line' | 'stop';
  id: string;
  size?: number;
}

const FavoriteButton: React.FC<Props> = ({ type, id, size = 18 }) => {
  const {
    favoriteLines,
    favoriteStops,
    addFavoriteLine,
    removeFavoriteLine,
    addFavoriteStop,
    removeFavoriteStop,
  } = useAppStore();

  const list = type === 'line' ? favoriteLines : favoriteStops;
  const active = list.includes(id);

  const onToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (active) {
      if (type === 'line') removeFavoriteLine(id);
      else removeFavoriteStop(id);
    } else {
      if (type === 'line') addFavoriteLine(id);
      else addFavoriteStop(id);
    }
  };

  return (
    <button
      onClick={onToggle}
      title={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      style={{
        width: size + 12,
        height: size + 12,
        borderRadius: '50%',
        background: active ? 'rgba(250,204,21,0.12)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? 'rgba(250,204,21,0.4)' : 'var(--border-light)'}`,
        color: active ? '#facc15' : 'var(--text-secondary)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        flexShrink: 0,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  );
};

export default FavoriteButton;

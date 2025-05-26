import React from 'react';
import { IconButton } from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

interface IRefreshButton {
  handleRefreshClick: () => void;
}

export default function RefreshButton({ handleRefreshClick }: IRefreshButton) {
  return (
    <>
      <IconButton onClick={handleRefreshClick} size="small">
        <RefreshRoundedIcon />
      </IconButton>
    </>
  );
}

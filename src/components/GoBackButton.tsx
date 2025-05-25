import React from 'react';
import { IconButton } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';

interface IGoBackButton {
  handleClick: () => void;
}

export default function GoBackButton({ handleClick }: IGoBackButton) {
  return (
    <IconButton onClick={handleClick} size="small">
      <ArrowBackRoundedIcon />
    </IconButton>
  );
}

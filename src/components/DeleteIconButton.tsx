import React from 'react';
import { IconButton } from '@mui/material';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';

interface IDeleteButton {
  handleClickButton: () => void;
}

export default function DeleteIconButton({ handleClickButton }: IDeleteButton) {
  return (
    <IconButton onClick={handleClickButton} size="small">
      <DeleteOutlineRoundedIcon />
    </IconButton>
  );
}

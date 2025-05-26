import React from 'react';
import { Button } from '@mui/material';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';

interface IAddButton {
  handleClickButton: () => void;
}

export default function AddButton({ handleClickButton }: IAddButton) {
  return (
    <Button
      onClick={handleClickButton}
      size="small"
      startIcon={<AddCircleOutlineRoundedIcon />}
      sx={{ textTransform: 'none' }}
    >
      Add chart
    </Button>
  );
}

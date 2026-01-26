import React from 'react';
import { Box, Typography } from '@mui/material';

const Footer: React.FC = () => {
    return (
        <Box
            component="footer"
            sx={{
                py: 2,
                px: 2,
                mt: 'auto',
                backgroundColor: 'transparent',
                borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                textAlign: 'center'
            }}
        >
            <Typography variant="body2" color="text.secondary">
                © {new Date().getFullYear()} CoalLogix System. Version 1.0
            </Typography>
        </Box>
    );
};

export default Footer;

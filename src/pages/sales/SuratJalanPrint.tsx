import React from 'react';
import { Box, Typography, Grid } from '@mui/material';
import type { DeliveryOrder, SalesOrderDetailed, MasterCompany } from '../../types/supabase';

interface SuratJalanPrintProps {
    deliveryOrder: Partial<DeliveryOrder> | null;
    salesOrder: SalesOrderDetailed | null;
    company: MasterCompany | null;
    customProductName?: string | null;
}

export const SuratJalanPrint = React.forwardRef<HTMLDivElement, SuratJalanPrintProps>(
    ({ deliveryOrder, salesOrder, company, customProductName }, ref) => {
        if (!deliveryOrder || !salesOrder) return null;

        const today = new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        return (
            <div ref={ref} style={{
                width: '9.5in',
                height: '5.5in',
                padding: '0.4in',
                boxSizing: 'border-box',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#000',
                backgroundColor: '#fff',
                position: 'relative'
            }}>
                <style>{`
                    @media print {
                        @page {
                            size: 9.5in 5.5in;
                            margin: 0;
                        }
                        body {
                            margin: 0;
                            -webkit-print-color-adjust: exact;
                        }
                    }
                `}</style>

                {/* Header */}
                <Grid container spacing={2} sx={{ mb: 2, borderBottom: '2px double #000', pb: 1, alignItems: 'center' }}>
                    <Grid size={2} sx={{ display: 'flex', alignItems: 'center' }}>
                        {company?.logo_url ? (
                            <img src={company.logo_url} alt="Logo" style={{ maxHeight: '45px', maxWidth: '80px', objectFit: 'contain' }} />
                        ) : (
                            <Box sx={{ width: '45px', height: '45px', border: '1px dashed #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>
                                Logo
                            </Box>
                        )}
                    </Grid>
                    <Grid size={5}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold', fontFamily: 'monospace', fontSize: '13px', textTransform: 'uppercase', lineHeight: 1.2 }}>
                            {company?.name || 'PERUSAHAAN'}
                        </Typography>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '9px', display: 'block', mt: 0.5, lineHeight: 1.2 }}>
                            {company?.address1 || ''} {company?.city || ''}
                        </Typography>
                    </Grid>
                    <Grid size={5} sx={{ textAlign: 'right' }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', fontFamily: 'monospace', fontSize: '15px', letterSpacing: '1px', m: 0 }}>
                            SURAT JALAN
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold', m: 0 }}>
                            No: {deliveryOrder.sj_number || '----------'}
                        </Typography>
                    </Grid>
                </Grid>

                {/* Info Metadata */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid size={6}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: '11px' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '110px', padding: '2px 0' }}>Tanggal</td>
                                    <td style={{ width: '10px' }}>:</td>
                                    <td style={{ fontWeight: 'bold' }}>{today}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '2px 0' }}>No. Sales Order</td>
                                    <td>:</td>
                                    <td>{salesOrder.order_no}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '2px 0' }}>Customer</td>
                                    <td>:</td>
                                    <td style={{ fontWeight: 'bold' }}>{salesOrder.customer_name}</td>
                                </tr>
                            </tbody>
                        </table>
                    </Grid>
                    <Grid size={6}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: '11px' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '130px', padding: '2px 0' }}>No. Polisi (Truck)</td>
                                    <td style={{ width: '10px' }}>:</td>
                                    <td style={{ fontWeight: 'bold' }}>{deliveryOrder.truck_plate || '-'}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '2px 0' }}>Vessel/Barge</td>
                                    <td>:</td>
                                    <td>{deliveryOrder.vessel_name || '-'}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '2px 0' }}>No. Tiket Timbangan</td>
                                    <td>:</td>
                                    <td>{deliveryOrder.ticket_number || '-'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </Grid>
                </Grid>

                {/* Table */}
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    borderTop: '1px solid #000',
                    borderBottom: '1px solid #000',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    marginBottom: '15px'
                }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #000' }}>
                            <th style={{ textAlign: 'left', padding: '5px 0', width: '40px' }}>NO</th>
                            <th style={{ textAlign: 'left', padding: '5px 0' }}>NAMA BARANG</th>
                            <th style={{ textAlign: 'right', padding: '5px 0', width: '120px' }}>QTY (KG)</th>
                            <th style={{ textAlign: 'right', padding: '5px 0', width: '120px' }}>QTY (MT)</th>
                            <th style={{ textAlign: 'left', padding: '5px 0', width: '150px', paddingLeft: '20px' }}>KETERANGAN</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{ padding: '6px 0', verticalAlign: 'top' }}>1</td>
                            <td style={{ padding: '6px 0', verticalAlign: 'top', fontWeight: 'bold' }}>{customProductName || salesOrder.product_name}</td>
                            <td style={{ padding: '6px 0', textAlign: 'right', verticalAlign: 'top', fontWeight: 'bold' }}>
                                {Number(deliveryOrder.net_weight || 0).toLocaleString('id-ID')}
                            </td>
                            <td style={{ padding: '6px 0', textAlign: 'right', verticalAlign: 'top', fontWeight: 'bold' }}>
                                {(Number(deliveryOrder.net_weight || 0) / 1000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: '6px 0', verticalAlign: 'top', paddingLeft: '20px' }}>
                                Direct Delivery
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Signatures */}
                <Grid container spacing={1} sx={{ position: 'absolute', bottom: '0.4in', left: '0.4in', right: '0.4in', textAlign: 'center', fontFamily: 'monospace', fontSize: '11px' }}>
                    <Grid size={4}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '11px' }}>Penerima / Recipient,</Typography>
                        <Box sx={{ height: '45px' }} />
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '11px' }}>( ____________________ )</Typography>
                    </Grid>
                    <Grid size={4}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '11px' }}>Sopir / Driver,</Typography>
                        <Box sx={{ height: '45px' }} />
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '11px' }}>( ____________________ )</Typography>
                    </Grid>
                    <Grid size={4}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '11px' }}>Pengirim / Sender,</Typography>
                        <Box sx={{ height: '45px' }} />
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '11px' }}>( ____________________ )</Typography>
                    </Grid>
                </Grid>
            </div>
        );
    }
);

SuratJalanPrint.displayName = 'SuratJalanPrint';
export default SuratJalanPrint;

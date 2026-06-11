/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Box, Typography, Grid } from '@mui/material';
import type { SalesOrderDetailed, MasterCompany } from '../../types/supabase';

interface SuratJalanPrintProps {
    deliveryOrder: any;
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

        const items: any[] = deliveryOrder.items || [];
        
        // Sum weights
        const isStockpile = deliveryOrder.delivery_type === 'STOCKPILE';
        const totalGross = deliveryOrder.gross_weight !== null && deliveryOrder.gross_weight !== undefined
            ? Number(deliveryOrder.gross_weight)
            : (isStockpile && items.length > 0
                ? Number(items[items.length - 1].gross_weight || 0)
                : items.reduce((sum: number, item: any) => sum + (Number(item.gross_weight) || 0), 0));
        const totalTare = deliveryOrder.tare_weight !== null && deliveryOrder.tare_weight !== undefined
            ? Number(deliveryOrder.tare_weight)
            : (isStockpile && items.length > 0
                ? Number(items[items.length - 1].tare_weight || 0)
                : items.reduce((sum: number, item: any) => sum + (Number(item.tare_weight) || 0), 0));
        const totalNetto = deliveryOrder.net_weight !== null && deliveryOrder.net_weight !== undefined
            ? Number(deliveryOrder.net_weight)
            : (isStockpile && items.length > 0
                ? Number(items[items.length - 1].net_weight || 0)
                : items.reduce((sum: number, item: any) => sum + (Number(item.net_weight) || 0), 0));

        return (
            <div ref={ref} style={{
                width: '9.5in',
                height: '5.5in',
                padding: '0.4in',
                boxSizing: 'border-box',
                fontFamily: 'monospace',
                fontSize: '11px',
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
                <Grid container spacing={2} sx={{ mb: 1.5, borderBottom: '2px double #000', pb: 0.5, alignItems: 'center' }}>
                    <Grid size={2} sx={{ display: 'flex', alignItems: 'center' }}>
                        {company?.logo_url ? (
                            <img src={company.logo_url} alt="Logo" style={{ maxHeight: '40px', maxWidth: '75px', objectFit: 'contain' }} />
                        ) : (
                            <Box sx={{ width: '40px', height: '40px', border: '1px dashed #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>
                                Logo
                            </Box>
                        )}
                    </Grid>
                    <Grid size={5}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold', fontFamily: 'monospace', fontSize: '12px', textTransform: 'uppercase', lineHeight: 1.2 }}>
                            {company?.name || 'PERUSAHAAN'}
                        </Typography>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '8.5px', display: 'block', mt: 0.2, lineHeight: 1.1 }}>
                            {company?.address1 || ''} {company?.city || ''}
                        </Typography>
                    </Grid>
                    <Grid size={5} sx={{ textAlign: 'right' }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', fontFamily: 'monospace', fontSize: '14px', letterSpacing: '1px', m: 0 }}>
                            SURAT JALAN
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold', m: 0 }}>
                            No: {deliveryOrder.sj_number || '----------'}
                        </Typography>
                    </Grid>
                </Grid>

                {/* Info Metadata */}
                <Grid container spacing={2} sx={{ mb: 1.5 }}>
                    <Grid size={6}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: '10px' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '110px', padding: '1px 0' }}>Tanggal</td>
                                    <td style={{ width: '10px' }}>:</td>
                                    <td style={{ fontWeight: 'bold' }}>{today}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '1px 0' }}>No. Sales Order</td>
                                    <td>:</td>
                                    <td>{salesOrder.order_no}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '1px 0' }}>Customer</td>
                                    <td>:</td>
                                    <td style={{ fontWeight: 'bold' }}>{salesOrder.customer_name}</td>
                                </tr>
                            </tbody>
                        </table>
                    </Grid>
                    <Grid size={6}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: '10px' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '130px', padding: '1px 0' }}>Nama Produk (Pub)</td>
                                    <td style={{ width: '10px' }}>:</td>
                                    <td style={{ fontWeight: 'bold' }}>{customProductName || salesOrder.product_name}</td>
                                </tr>
                            </tbody>
                        </table>
                    </Grid>
                </Grid>

                {/* Table of detail items */}
                <div style={{ maxHeight: '1.9in', overflow: 'hidden' }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        borderTop: '1px solid #000',
                        borderBottom: '1px solid #000',
                        fontFamily: 'monospace',
                        fontSize: '9.5px',
                        marginBottom: '8px'
                    }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #000' }}>
                                <th style={{ textAlign: 'left', padding: '4px 0', width: '30px' }}>NO</th>
                                <th style={{ textAlign: 'left', padding: '4px 0', width: '100px' }}>NO. POLISI</th>
                                <th style={{ textAlign: 'left', padding: '4px 0' }}>PRODUK INTERNAL</th>
                                <th style={{ textAlign: 'right', padding: '4px 0', width: '80px' }}>GROSS (KG)</th>
                                <th style={{ textAlign: 'right', padding: '4px 0', width: '80px' }}>TARE (KG)</th>
                                <th style={{ textAlign: 'right', padding: '4px 0', width: '90px' }}>{isStockpile ? 'PRODUK NET (KG)' : 'NETTO (KG)'}</th>
                                <th style={{ textAlign: 'left', padding: '4px 0', width: '100px', paddingLeft: '15px' }}>KET</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length > 0 ? (
                                items.map((item: any, idx: number) => (
                                    <tr key={item.id || idx}>
                                        <td style={{ padding: '3px 0' }}>{idx + 1}</td>
                                        <td style={{ padding: '3px 0', fontWeight: 'bold' }}>{item.truck_plate || '-'}</td>
                                        <td style={{ padding: '3px 0' }}>{item.internal_product?.name || '-'}</td>
                                        <td style={{ padding: '3px 0', textAlign: 'right' }}>{Number(item.gross_weight || 0).toLocaleString('id-ID')}</td>
                                        <td style={{ padding: '3px 0', textAlign: 'right' }}>{Number(item.tare_weight || 0).toLocaleString('id-ID')}</td>
                                        <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 'bold' }}>{Number(isStockpile && item.produk_net !== undefined && item.produk_net !== null ? item.produk_net : item.net_weight || 0).toLocaleString('id-ID')}</td>
                                        <td style={{ padding: '3px 0', paddingLeft: '15px' }}>
                                            {item.type_production?.nama_type || item.blending?.nama_blending || '-'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td style={{ padding: '3px 0' }}>1</td>
                                    <td style={{ padding: '3px 0', fontWeight: 'bold' }}>{deliveryOrder.truck_plate || '-'}</td>
                                    <td style={{ padding: '3px 0' }}>{deliveryOrder.internal_product_name || '-'}</td>
                                    <td style={{ padding: '3px 0', textAlign: 'right' }}>{Number(deliveryOrder.gross_weight || 0).toLocaleString('id-ID')}</td>
                                    <td style={{ padding: '3px 0', textAlign: 'right' }}>{Number(deliveryOrder.tare_weight || 0).toLocaleString('id-ID')}</td>
                                    <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 'bold' }}>{Number(deliveryOrder.net_weight || 0).toLocaleString('id-ID')}</td>
                                    <td style={{ padding: '3px 0', paddingLeft: '15px' }}>-</td>
                                </tr>
                            )}
                            
                            {/* Summary row */}
                            <tr style={{ borderTop: '1px dashed #000', fontWeight: 'bold' }}>
                                <td colSpan={3} style={{ padding: '4px 0', textAlign: 'left' }}>TOTAL</td>
                                <td style={{ padding: '4px 0', textAlign: 'right' }}>
                                    {(items.length > 0 ? totalGross : Number(deliveryOrder.gross_weight || 0)).toLocaleString('id-ID')}
                                </td>
                                <td style={{ padding: '4px 0', textAlign: 'right' }}>
                                    {(items.length > 0 ? totalTare : Number(deliveryOrder.tare_weight || 0)).toLocaleString('id-ID')}
                                </td>
                                <td style={{ padding: '4px 0', textAlign: 'right', color: 'blue' }}>
                                    {(items.length > 0 ? totalNetto : Number(deliveryOrder.net_weight || 0)).toLocaleString('id-ID')}
                                </td>
                                <td style={{ padding: '4px 0', paddingLeft: '15px' }}>
                                    {((items.length > 0 ? totalNetto : Number(deliveryOrder.net_weight || 0)) / 1000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Signatures */}
                <Grid container spacing={1} sx={{ position: 'absolute', bottom: '0.3in', left: '0.4in', right: '0.4in', textAlign: 'center', fontFamily: 'monospace', fontSize: '10px' }}>
                    <Grid size={4}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '10px' }}>Penerima / Recipient,</Typography>
                        <Box sx={{ height: '35px' }} />
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '10px' }}>( ____________________ )</Typography>
                    </Grid>
                    <Grid size={4}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '10px' }}>Sopir / Driver,</Typography>
                        <Box sx={{ height: '35px' }} />
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '10px' }}>( ____________________ )</Typography>
                    </Grid>
                    <Grid size={4}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '10px' }}>Pengirim / Sender,</Typography>
                        <Box sx={{ height: '35px' }} />
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '10px' }}>( ____________________ )</Typography>
                    </Grid>
                </Grid>
            </div>
        );
    }
);

SuratJalanPrint.displayName = 'SuratJalanPrint';
export default SuratJalanPrint;

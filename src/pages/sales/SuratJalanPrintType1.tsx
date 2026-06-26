/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import type { SalesOrderDetailed, MasterCompany } from '../../types/supabase';

interface SuratJalanPrintProps {
    deliveryOrder: any;
    salesOrder: SalesOrderDetailed | null;
    company: MasterCompany | null;
    customProductName?: string | null;
}

export const SuratJalanPrintType1 = React.forwardRef<HTMLDivElement, SuratJalanPrintProps>(
    ({ deliveryOrder, salesOrder, company, customProductName }, ref) => {
        if (!deliveryOrder) return null;

        const doDate = deliveryOrder.date_of_issue || deliveryOrder.created_at;
        const formattedDate = doDate
            ? new Date(doDate).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            })
            : new Date().toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

        const customerName = deliveryOrder.customer_name || salesOrder?.customer_name || '-';
        const customerAddress = deliveryOrder.customer_address || salesOrder?.customer_address || '-';
        const transporterName = deliveryOrder.transporter_name || '-';
        const poNumber = salesOrder?.order_no || '-';
        const truckPlate = deliveryOrder.truck_plate || '-';
        const sjNumber = deliveryOrder.sj_number || '----------';
        const productName = customProductName || deliveryOrder.published_product_name || salesOrder?.product_name || '-';

        const grossWeight = Number(deliveryOrder.gross_weight || 0).toLocaleString('id-ID');
        const tareWeight = Number(deliveryOrder.tare_weight || 0).toLocaleString('id-ID');
        const netWeight = Number(deliveryOrder.net_weight || 0).toLocaleString('id-ID');

        return (
            <div ref={ref} style={{
                width: '8.2in', /* Adjusted for dot matrix printable area to prevent right cutoff */
                height: '5.5in',
                boxSizing: 'border-box',
                fontFamily: "'Tahoma', 'Times New Roman', sans-serif", /* More distinct characters */
                fontSize: '11pt',
                color: '#000000',
                backgroundColor: '#ffffff',
                position: 'relative',
                padding: '0.4in 0.2in 0.2in 0.3in', /* Added left margin 0.3in */
                overflow: 'hidden',
                WebkitFontSmoothing: 'none',
                MozOsxFontSmoothing: 'none',
                textRendering: 'optimizeSpeed'
            }}>
                <style>{`
                    @media print {
                        @page {
                            size: 9.5in 5.5in landscape;
                            margin: 0;
                        }
                        body {
                            margin: 0;
                            padding: 0;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                            background-color: #ffffff !important;
                            color: #000000 !important;
                        }
                        * {
                            color: #000000 !important;
                            text-shadow: none !important;
                            -webkit-font-smoothing: none !important;
                            -moz-osx-font-smoothing: none !important;
                            font-smooth: never !important;
                            text-rendering: optimizeSpeed !important;
                        }
                    }
                `}</style>

                {/* Header (Top Row) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    {/* Company info on the left */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontSize: '14pt', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', lineHeight: 1.1 }}>
                                {company?.name || 'PERUSAHAAN'}
                            </span>
                        </div>
                    </div>

                    {/* Outlined title banner on the right */}
                    <div style={{
                        border: '2px solid #000000',
                        color: '#000000',
                        padding: '4px 20px',
                        fontSize: '14pt',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        letterSpacing: '2px'
                    }}>
                        SURAT JALAN
                    </div>
                </div>

                {/* Metadata Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    {/* TYPE 1: Left block (Waybill identifiers) */}
                    <div style={{ width: '45%' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11pt', lineHeight: '1.3' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '110px', verticalAlign: 'top' }}>Nomor SJ</td>
                                    <td style={{ width: '10px', verticalAlign: 'top' }}>:</td>
                                    <td style={{ verticalAlign: 'top', fontWeight: 'bold' }}>{sjNumber}</td>
                                </tr>
                                <tr>
                                    <td style={{ verticalAlign: 'top' }}>Tanggal</td>
                                    <td style={{ verticalAlign: 'top' }}>:</td>
                                    <td style={{ verticalAlign: 'top' }}>{formattedDate}</td>
                                </tr>
                                <tr>
                                    <td style={{ verticalAlign: 'top' }}>Nomor PO</td>
                                    <td style={{ verticalAlign: 'top' }}>:</td>
                                    <td style={{ verticalAlign: 'top' }}>{poNumber}</td>
                                </tr>
                                <tr>
                                    <td style={{ verticalAlign: 'top' }}>No. Polisi</td>
                                    <td style={{ verticalAlign: 'top' }}>:</td>
                                    <td style={{ verticalAlign: 'top' }}>{truckPlate}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* TYPE 1: Right block (Customer & Transporter details) */}
                    <div style={{ width: '50%' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11pt', lineHeight: '1.3' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '140px', verticalAlign: 'top' }}>Kepada Yth</td>
                                    <td style={{ width: '10px', verticalAlign: 'top' }}>:</td>
                                    <td style={{ verticalAlign: 'top', fontWeight: 'bold' }}>{customerName}</td>
                                </tr>
                                <tr>
                                    <td style={{ verticalAlign: 'top' }}>Alamat</td>
                                    <td style={{ verticalAlign: 'top' }}>:</td>
                                    <td style={{ verticalAlign: 'top', fontSize: '10pt', lineHeight: '1.2' }}>{customerAddress}</td>
                                </tr>
                                <tr>
                                    <td colSpan={3} style={{ height: '6px' }}></td>
                                </tr>
                                <tr>
                                    <td style={{ verticalAlign: 'top' }}>Barang Dikirim oleh</td>
                                    <td style={{ verticalAlign: 'top' }}>:</td>
                                    <td style={{ verticalAlign: 'top' }}>{transporterName}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Table (Quantity and weights) */}
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1px solid #000000',
                    fontSize: '11pt'
                }}>
                    <thead>
                        <tr>
                            <th rowSpan={2} style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle', width: '40%', fontWeight: 'bold' }}>
                                Nama Barang
                            </th>
                            <th colSpan={3} style={{ border: '1px solid #000000', padding: '2px 6px', textAlign: 'center', fontWeight: 'bold' }}>
                                Quantity (Kg)
                            </th>
                            <th rowSpan={2} style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle', width: '25%', fontWeight: 'bold' }}>
                                Keterangan
                            </th>
                        </tr>
                        <tr>
                            <th colSpan={2} style={{ border: '1px solid #000000', padding: '2px 6px', textAlign: 'center', fontWeight: 'bold' }}>Kirim</th>
                            <th style={{ border: '1px solid #000000', padding: '2px 6px', textAlign: 'center', width: '12.5%', fontWeight: 'bold' }}>Terima</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Gross weight row */}
                        <tr>
                            <td rowSpan={3} style={{ border: '1px solid #000000', padding: '6px', verticalAlign: 'top', fontWeight: 'bold' }}>
                                {productName}
                            </td>
                            <td style={{ border: '1px solid #000000', padding: '3px 6px', width: '10%' }}>Gross</td>
                            <td style={{ border: '1px solid #000000', padding: '3px 6px', textAlign: 'right', width: '12.5%' }}>{grossWeight}</td>
                            <td style={{ border: '1px solid #000000', padding: '3px 6px', width: '12.5%' }}></td>
                            <td rowSpan={3} style={{ border: '1px solid #000000', padding: '6px', verticalAlign: 'top' }}>
                                
                            </td>
                        </tr>
                        {/* Tare weight row */}
                        <tr>
                            <td style={{ border: '1px solid #000000', padding: '3px 6px' }}>Tare</td>
                            <td style={{ border: '1px solid #000000', padding: '3px 6px', textAlign: 'right' }}>{tareWeight}</td>
                            <td style={{ border: '1px solid #000000', padding: '3px 6px' }}></td>
                        </tr>
                        {/* Net weight row */}
                        <tr>
                            <td style={{ border: '1px solid #000000', padding: '3px 6px', fontWeight: 'bold' }}>Netto</td>
                            <td style={{ border: '1px solid #000000', padding: '3px 6px', textAlign: 'right', fontWeight: 'bold' }}>{netWeight}</td>
                            <td style={{ border: '1px solid #000000', padding: '3px 6px' }}></td>
                        </tr>
                    </tbody>
                </table>

                {/* Italicized footnote below the table */}
                <div style={{ fontStyle: 'italic', fontSize: '10pt', marginTop: '4px', color: '#000000' }}>
                    Barang sudah dikirim dan diterima dalam keadaan baik
                </div>

                {/* Signatures Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                    {/* Left Box (Pengirim) */}
                    <div style={{ width: '48%' }}>
                        <div style={{ fontSize: '11pt', fontWeight: 'bold', marginBottom: '3px', height: '14px', color: '#000000' }}>Pengirim</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000000', height: '55px' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '50%', borderRight: '1px solid #000000', verticalAlign: 'bottom', padding: '4px', fontSize: '10pt' }}>
                                        <div style={{ height: '25px' }}></div>
                                        <div>Nama &nbsp;: ________________</div>
                                        <div style={{ marginTop: '2px' }}>Jabatan: ________________</div>
                                    </td>
                                    <td style={{ width: '50%', verticalAlign: 'bottom', padding: '4px', fontSize: '10pt' }}>
                                        <div style={{ height: '25px' }}></div>
                                        <div>Nama &nbsp;: ________________</div>
                                        <div style={{ marginTop: '2px' }}>Jabatan: PENGEMUDI</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Right Box (Penerima) */}
                    <div style={{ width: '48%' }}>
                        <div style={{ fontSize: '11pt', fontWeight: 'bold', marginBottom: '3px', height: '14px', color: '#000000' }}>Penerima</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000000', height: '55px' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '50%', borderRight: '1px solid #000000', verticalAlign: 'bottom', padding: '4px', fontSize: '10pt' }}>
                                        <div style={{ height: '25px' }}></div>
                                        <div>Nama &nbsp;: ________________</div>
                                        <div style={{ marginTop: '2px' }}>Jabatan: ________________</div>
                                    </td>
                                    <td style={{ width: '50%', verticalAlign: 'bottom', padding: '4px', fontSize: '10pt' }}>
                                        <div style={{ height: '25px' }}></div>
                                        <div>Nama &nbsp;: ________________</div>
                                        <div style={{ marginTop: '2px' }}>Jabatan: ________________</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Color-coded copy labels footer */}
                <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '0.3in',
                    right: '0.3in',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '10pt',
                    fontStyle: 'italic',
                    borderTop: '1px dashed #000000',
                    paddingTop: '3px',
                    color: '#000000'
                }}>
                    <span>Putih : Penjual</span>
                    <span>Kuning : Pembeli</span>
                    <span>Merah : Angkutan</span>
                    <span>Hijau : Arsip</span>
                </div>
            </div>
        );
    }
);

SuratJalanPrintType1.displayName = 'SuratJalanPrintType1';
export default SuratJalanPrintType1;

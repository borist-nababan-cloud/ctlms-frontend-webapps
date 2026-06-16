/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import type { SalesOrderDetailed, MasterCompany } from '../../types/supabase';

interface SuratJalanPrintProps {
    deliveryOrder: any;
    salesOrder: SalesOrderDetailed | null;
    company: MasterCompany | null;
    customProductName?: string | null;
}

export const SuratJalanPrint = React.forwardRef<HTMLDivElement, SuratJalanPrintProps>(
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

        const notesDisplay = deliveryOrder.notes || (deliveryOrder.type_blending && deliveryOrder.type_blending !== 'NONE' ? deliveryOrder.type_blending : '');

        return (
            <div ref={ref} style={{
                width: '9.1in',
                height: '5.1in',
                boxSizing: 'border-box',
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: '11px',
                color: '#000',
                backgroundColor: '#fff',
                position: 'relative',
                padding: '0.1in 0'
            }}>
                <style>{`
                    @media print {
                        @page {
                            size: 9.5in 5.5in;
                            margin: 0.2in;
                        }
                        body {
                            margin: 0;
                            -webkit-print-color-adjust: exact;
                        }
                    }
                `}</style>

                {/* Header (Top Row) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    {/* Company info and logo on the left */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {company?.logo_url ? (
                            <img src={company.logo_url} alt="Logo" style={{ maxHeight: '45px', maxWidth: '90px', objectFit: 'contain' }} />
                        ) : (
                            <div style={{ width: '45px', height: '45px', border: '1px dashed #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>
                                Logo
                            </div>
                        )}
                        <div>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', lineHeight: 1.1 }}>
                                {company?.name || 'PERUSAHAAN'}
                            </span>
                        </div>
                    </div>

                    {/* Black title banner on the right */}
                    <div style={{
                        backgroundColor: '#000',
                        color: '#fff',
                        padding: '5px 30px',
                        fontSize: '15px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        letterSpacing: '2px'
                    }}>
                        SURAT JALAN
                    </div>
                </div>

                {/* Metadata Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    {/* Left block (Customer & Transporter details) */}
                    <div style={{ width: '53%' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', lineHeight: '1.3' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '130px', verticalAlign: 'top' }}>Kepada Yth</td>
                                    <td style={{ width: '10px', verticalAlign: 'top' }}>:</td>
                                    <td style={{ verticalAlign: 'top', fontWeight: 'bold' }}>{customerName}</td>
                                </tr>
                                <tr>
                                    <td style={{ verticalAlign: 'top' }}>Alamat</td>
                                    <td style={{ verticalAlign: 'top' }}>:</td>
                                    <td style={{ verticalAlign: 'top', fontSize: '9.5px', lineHeight: '1.2' }}>{customerAddress}</td>
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

                    {/* Right block (Waybill identifiers) */}
                    <div style={{ width: '42%' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', lineHeight: '1.3' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '100px', verticalAlign: 'top' }}>Nomor SJ</td>
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
                </div>

                {/* Table (Quantity and weights) */}
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1px solid #000',
                    fontSize: '10px'
                }}>
                    <thead>
                        <tr>
                            <th rowSpan={2} style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left', verticalAlign: 'middle', width: '38%' }}>
                                Nama Barang
                            </th>
                            <th colSpan={3} style={{ border: '1px solid #000', padding: '2px 6px', textAlign: 'center' }}>
                                Quantity (Kg)
                            </th>
                            <th rowSpan={2} style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left', verticalAlign: 'middle', width: '30%' }}>
                                KETERANGAN
                            </th>
                        </tr>
                        <tr>
                            <th colSpan={2} style={{ border: '1px solid #000', padding: '2px 6px', textAlign: 'center' }}>KIRIM</th>
                            <th style={{ border: '1px solid #000', padding: '2px 6px', textAlign: 'center', width: '16%' }}>TERIMA</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Gross weight row */}
                        <tr>
                            <td rowSpan={3} style={{ border: '1px solid #000', padding: '6px', verticalAlign: 'top', fontWeight: 'bold' }}>
                                {productName}
                            </td>
                            <td style={{ border: '1px solid #000', padding: '3px 6px', width: '12%' }}>GROSS</td>
                            <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'right', width: '16%' }}>{grossWeight}</td>
                            <td style={{ border: '1px solid #000', padding: '3px 6px', width: '16%' }}></td>
                            <td rowSpan={3} style={{ border: '1px solid #000', padding: '6px', verticalAlign: 'top' }}>
                                {notesDisplay}
                            </td>
                        </tr>
                        {/* Tare weight row */}
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '3px 6px' }}>TARE</td>
                            <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'right' }}>{tareWeight}</td>
                            <td style={{ border: '1px solid #000', padding: '3px 6px' }}></td>
                        </tr>
                        {/* Net weight row */}
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '3px 6px', fontWeight: 'bold' }}>NETTO</td>
                            <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'right', fontWeight: 'bold' }}>{netWeight}</td>
                            <td style={{ border: '1px solid #000', padding: '3px 6px' }}></td>
                        </tr>
                    </tbody>
                </table>

                {/* Italicized footnote below the table */}
                <div style={{ fontStyle: 'italic', fontSize: '9px', marginTop: '4px' }}>
                    Barang sudah dikirim dan diterima dalam keadaan baik
                </div>

                {/* Signatures Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                    {/* Left Box (Pengirim) */}
                    <div style={{ width: '48%' }}>
                        <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '3px', height: '14px' }}>Pengirim</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', height: '70px' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '50%', borderRight: '1px solid #000', verticalAlign: 'bottom', padding: '4px', fontSize: '9px' }}>
                                        <div style={{ height: '40px' }}></div>
                                        <div>Nama &nbsp;: ________________</div>
                                        <div style={{ marginTop: '2px' }}>Jabatan: ________________</div>
                                    </td>
                                    <td style={{ width: '50%', verticalAlign: 'bottom', padding: '4px', fontSize: '9px' }}>
                                        <div style={{ height: '40px' }}></div>
                                        <div>Nama &nbsp;: ________________</div>
                                        <div style={{ marginTop: '2px' }}>Jabatan: PENGEMUDI</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Right Box (Penerima) */}
                    <div style={{ width: '48%' }}>
                        <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '3px', height: '14px' }}>&nbsp;</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', height: '70px' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '50%', borderRight: '1px solid #000', verticalAlign: 'bottom', padding: '4px', fontSize: '9px' }}>
                                        <div style={{ height: '40px' }}></div>
                                        <div>Nama &nbsp;: ________________</div>
                                        <div style={{ marginTop: '2px' }}>Jabatan: ________________</div>
                                    </td>
                                    <td style={{ width: '50%', verticalAlign: 'bottom', padding: '4px', fontSize: '9px' }}>
                                        <div style={{ height: '40px' }}></div>
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
                    bottom: '5px',
                    left: '5px',
                    right: '5px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '9px',
                    fontStyle: 'italic',
                    borderTop: '1px dashed #ccc',
                    paddingTop: '3px'
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

SuratJalanPrint.displayName = 'SuratJalanPrint';
export default SuratJalanPrint;

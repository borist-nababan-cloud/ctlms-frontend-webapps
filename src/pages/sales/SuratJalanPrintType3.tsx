/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import type { SalesOrderDetailed, MasterCompany } from '../../types/supabase';

interface SuratJalanPrintProps {
    deliveryOrder: any;
    salesOrder: SalesOrderDetailed | null;
    company: MasterCompany | null;
    customProductName?: string | null;
}

export const SuratJalanPrintType3 = React.forwardRef<HTMLDivElement, SuratJalanPrintProps>(
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
        const poNumber = salesOrder?.po_number || '-';
        const truckPlate = deliveryOrder.truck_plate || '-';
        const sjNumber = deliveryOrder.sj_number || '----------';
        const productName = customProductName || deliveryOrder.published_product_name || salesOrder?.product_name || '-';

        const grossWeight = Number(deliveryOrder.gross_weight || 0).toLocaleString('id-ID');
        const tareWeight = Number(deliveryOrder.tare_weight || 0).toLocaleString('id-ID');
        const netWeight = Number(deliveryOrder.net_weight || 0).toLocaleString('id-ID');

        return (
            <div ref={ref} style={{
                width: '8.2in',
                height: '5.5in',
                boxSizing: 'border-box',
                fontFamily: "'Tahoma', 'Times New Roman', sans-serif",
                fontSize: '11pt',
                lineHeight: '1.2',
                color: '#000000',
                backgroundColor: '#ffffff',
                position: 'relative',
                padding: '0.4in 0.3in 0.2in 0.3in',
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
                    .table-border {
                        border-collapse: collapse;
                        width: 100%;
                    }
                    .table-border th, .table-border td {
                        border: 1px solid #000000;
                        padding: 2px 4px;
                    }
                `}</style>

                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                    {/* Left: Company Name & Vehicle Info */}
                    <div style={{ width: '58%' }}>
                        <div style={{ fontSize: '16pt', fontWeight: 'bold', marginBottom: '15px', color: '#000000' }}>
                            {company?.name || 'PERUSAHAAN'}
                        </div>
                        <div style={{ marginBottom: '4px' }}>Kami kirimkan Batu Bara dibawah ini,</div>
                        <div style={{ display: 'flex', whiteSpace: 'nowrap', marginBottom: '2px' }}>
                            <span style={{ width: '280px' }}>Bersama kendaraan dengan Nomor Polisi</span>
                            <span>: &nbsp;{truckPlate}</span>
                        </div>
                        <div style={{ display: 'flex', whiteSpace: 'nowrap', marginBottom: '2px' }}>
                            <span style={{ width: '280px' }}>Nama Supir</span>
                            <span>:</span>
                        </div>
                        <div style={{ display: 'flex', whiteSpace: 'nowrap' }}>
                            <span style={{ width: '280px' }}>Armada</span>
                            <span>: &nbsp;{transporterName}</span>
                        </div>
                    </div>

                    {/* Right: SJ Info & Transporter Info */}
                    <div style={{ width: '40%' }}>
                        <div style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '8px', display: 'flex', whiteSpace: 'nowrap' }}>
                            <span style={{ width: '180px' }}>SURAT JALAN NO</span>
                            <span style={{ flex: 1, paddingLeft: '10px' }}>{sjNumber}</span>
                        </div>
                        <table style={{ width: '100%', fontSize: '11pt', borderCollapse: 'collapse' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '100px', verticalAlign: 'top', padding: '2px 0' }}>Tanggal</td>
                                    <td style={{ width: '15px', verticalAlign: 'top', padding: '2px 0' }}>:</td>
                                    <td style={{ verticalAlign: 'top', padding: '2px 0' }}>{formattedDate}</td>
                                </tr>
                                <tr>
                                    <td style={{ verticalAlign: 'top', padding: '2px 0' }}>No. PO</td>
                                    <td style={{ verticalAlign: 'top', padding: '2px 0' }}>:</td>
                                    <td style={{ verticalAlign: 'top', padding: '2px 0' }}>{poNumber}</td>
                                </tr>
                                <tr>
                                    <td style={{ verticalAlign: 'top', padding: '2px 0' }}>Kepada Yth</td>
                                    <td style={{ verticalAlign: 'top', padding: '2px 0' }}>:</td>
                                    <td style={{ verticalAlign: 'top', padding: '2px 0' }}>{customerName}</td>
                                </tr>
                                <tr>
                                    <td style={{ verticalAlign: 'top', padding: '2px 0' }}>Alamat</td>
                                    <td style={{ verticalAlign: 'top', padding: '2px 0' }}>:</td>
                                    <td style={{ verticalAlign: 'top', padding: '2px 0', minHeight: '40px' }}>{customerAddress}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Table 1: Goods */}
                <table className="table-border" style={{ marginBottom: '8px', textAlign: 'center' }}>
                    <thead>
                        <tr style={{ whiteSpace: 'nowrap' }}>
                            <th style={{ width: '30%', fontWeight: 'bold' }}>NAMA BARANG</th>
                            <th colSpan={2} style={{ width: '25%', fontWeight: 'bold' }}>QUANTITY KIRIM (KG)</th>
                            <th colSpan={2} style={{ width: '25%', fontWeight: 'bold' }}>QUANTITY TERIMA (KG)</th>
                            <th style={{ width: '20%', fontWeight: 'bold' }}>KETERANGAN</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td rowSpan={3} style={{ verticalAlign: 'middle' }}>{productName}</td>
                            <td style={{ textAlign: 'left', paddingLeft: '15px', width: '8%' }}>Gross</td>
                            <td style={{ textAlign: 'center', width: '17%' }}>{grossWeight}</td>
                            <td style={{ textAlign: 'left', paddingLeft: '15px', width: '8%' }}>Gross</td>
                            <td style={{ width: '17%' }}></td>
                            <td rowSpan={3}></td>
                        </tr>
                        <tr>
                            <td style={{ textAlign: 'left', paddingLeft: '15px' }}>Tare</td>
                            <td style={{ textAlign: 'center' }}>{tareWeight}</td>
                            <td style={{ textAlign: 'left', paddingLeft: '15px' }}>Tare</td>
                            <td></td>
                        </tr>
                        <tr>
                            <td style={{ textAlign: 'left', paddingLeft: '15px' }}>Netto</td>
                            <td style={{ textAlign: 'center' }}>{netWeight}</td>
                            <td style={{ textAlign: 'left', paddingLeft: '15px' }}>Netto</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>

                {/* Table 2: Signatures */}
                <table className="table-border" style={{ textAlign: 'center' }}>
                    <thead>
                        <tr style={{ whiteSpace: 'nowrap' }}>
                            <th style={{ width: '25%', fontWeight: 'normal' }}>Keterangan</th>
                            <th style={{ width: '25%', fontWeight: 'normal' }}>Cap & TTD Penerima</th>
                            <th style={{ width: '25%', fontWeight: 'normal' }}>TTD Pengirim Barang</th>
                            <th style={{ width: '25%', fontWeight: 'normal' }}>Hormat Kami</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{ height: '110px' }}></td>
                            <td></td>
                            <td rowSpan={2} style={{ verticalAlign: 'bottom', paddingBottom: '2px' }}>
                                <div>(......................................)</div>
                                <div>Nama Supir</div>
                            </td>
                            <td rowSpan={2} style={{ verticalAlign: 'bottom', paddingBottom: '2px' }}>
                                <div>(......................................)</div>
                                <div>Bagian Pengiriman Barang</div>
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={2} style={{ textAlign: 'left', verticalAlign: 'top', padding: '4px 15px' }}>
                                <div style={{ display: 'flex', marginBottom: '2px' }}>
                                    <span style={{ width: '120px' }}>Nama Penerima</span>
                                    <span>:</span>
                                </div>
                                <div style={{ display: 'flex', marginBottom: '2px' }}>
                                    <span style={{ width: '120px' }}>Jabatan</span>
                                    <span>:</span>
                                </div>
                                <div style={{ display: 'flex' }}>
                                    <span style={{ width: '120px' }}>Tanggal</span>
                                    <span>:</span>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }
);

SuratJalanPrintType3.displayName = 'SuratJalanPrintType3';
export default SuratJalanPrintType3;

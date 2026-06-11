/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Box,
    Button,
    Container,
    Typography,
    Alert,
    IconButton,
    Tooltip,
    CircularProgress,
    Snackbar
} from '@mui/material';
import { Edit as EditIcon, Print as PrintIcon, Add as AddIcon } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import {
    MaterialReactTable,
    useMaterialReactTable,
    type MRT_ColumnDef,
} from 'material-react-table';
import { useColorMode } from '../../context/ThemeContext';
import { deliveryService } from '../../lib/deliveryService';
import { masterService } from '../../lib/masterService';
import { supabase } from '../../lib/supabaseClient';
import type { SalesOrderDetailed, DeliveryOrder, MasterCompany } from '../../types/supabase';
import SuratJalanPrint from './SuratJalanPrint';
import StockpileDeliveryForm from './StockpileDeliveryForm';

const StockpileDelivery: React.FC = () => {
    const { mode } = useColorMode();
    const printRef = useRef<HTMLDivElement>(null);

    // Lists
    const [salesOrders, setSalesOrders] = useState<SalesOrderDetailed[]>([]);
    const [company, setCompany] = useState<MasterCompany | null>(null);
    const [prevDeliveries, setPrevDeliveries] = useState<any[]>([]);

    // Modal Control States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDO, setEditingDO] = useState<any | null>(null);

    // States
    const [loading, setLoading] = useState(false);
    const [tableLoading, setTableLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // For Print Snapshot
    const [printDO, setPrintDO] = useState<(Partial<DeliveryOrder> & { items?: any[] }) | null>(null);
    const [printSO, setPrintSO] = useState<SalesOrderDetailed | null>(null);
    const [printCustomProductName, setPrintCustomProductName] = useState<string>('');

    // React To Print
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: 'Surat Jalan'
    });

    const handleOpenAddModal = () => {
        setEditingDO(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (rowItem: any) => {
        setEditingDO(rowItem);
        setIsModalOpen(true);
    };

    const handleReprint = async (rowItem: any) => {
        try {
            setError(null);
            let companyInfo = null;
            if (rowItem.company_id) {
                companyInfo = await masterService.getCompanyById(rowItem.company_id);
            }
            setCompany(companyInfo);

            let so = salesOrders.find(item => item.id === rowItem.sales_order_id) || null;
            if (!so) {
                const { data, error: soError } = await supabase
                    .from('sales_orders')
                    .select(`
                        *,
                        customer:master_partners(name),
                        product:master_products(name, sku_code),
                        company:master_companies(name)
                    `)
                    .eq('id', rowItem.sales_order_id)
                    .single();
                if (!soError && data) {
                    so = {
                        ...data,
                        customer_name: data.customer?.name || '-',
                        product_name: data.product_name || data.product?.name || '-',
                        sku_code: data.product?.sku_code || '-',
                        company_name: data.company?.name || '-'
                    };
                }
            }
            
            if (so) {
                setPrintSO(so);
            } else {
                setPrintSO({
                    id: rowItem.sales_order_id,
                    order_no: rowItem.so_number || '-',
                    customer_name: rowItem.customer_name || '-',
                    product_name: rowItem.product_name || '-',
                    qty_ordered: 0,
                    price_per_kg: 0,
                    status: 'COMPLETED',
                    is_completed: true,
                    company_id: rowItem.company_id,
                    customer_id: '',
                    product_id: ''
                });
            }

            setPrintDO(rowItem);
            setPrintCustomProductName(rowItem.published_product_name || rowItem.product_name || '');
            
            setTimeout(() => {
                handlePrint();
            }, 500);
        } catch (err: any) {
            console.error('Error printing document:', err);
            setError('Terjadi kesalahan pada sistem saat mencetak dokumen.');
        }
    };

    // Load initial data
    const loadInitialData = async () => {
        try {
            setLoading(true);
            setError(null);
            const orders = await deliveryService.getActiveSalesOrders();
            setSalesOrders(orders);
        } catch (err: any) {
            console.error('Error loading initial data:', err);
            setError('Terjadi kesalahan pada sistem saat memuat data.');
        } finally {
            setLoading(false);
        }
    };

    const loadDeliveries = async () => {
        try {
            setTableLoading(true);
            const data = await deliveryService.getDeliveryOrdersDetailed('STOCKPILE');
            setPrevDeliveries(data);
        } catch (err: any) {
            console.error('Error loading delivery history:', err);
        } finally {
            setTableLoading(false);
        }
    };

    useEffect(() => {
        loadInitialData();
        loadDeliveries();
    }, []);

    const handleFormSuccess = async (savedHeader: any, savedItems: any[]) => {
        setSuccessMsg(editingDO ? 'Surat Jalan berhasil diperbarui!' : 'Surat Jalan berhasil disimpan!');
        loadDeliveries();

        if (!editingDO) {
            try {
                let companyInfo = null;
                if (savedHeader.company_id) {
                    companyInfo = await masterService.getCompanyById(savedHeader.company_id);
                }
                setCompany(companyInfo);

                const so = salesOrders.find(item => item.id === savedHeader.sales_order_id) || null;
                if (so) {
                    setPrintSO(so);
                }

                setPrintDO({
                    ...savedHeader,
                    items: savedItems
                });
                setPrintCustomProductName(savedHeader.published_product_name || '');
                
                setTimeout(() => {
                    handlePrint();
                }, 500);
            } catch (printErr) {
                console.error('Printing error after success:', printErr);
            }
        }
    };

    // Material React Table columns
    const columns = useMemo<MRT_ColumnDef<any>[]>(() => [
        {
            accessorKey: 'sj_number',
            header: 'No. Surat Jalan',
            size: 150,
            Cell: ({ cell }) => <span style={{ fontWeight: 'bold' }}>{cell.getValue<string>()}</span>
        },
        {
            accessorKey: 'so_number',
            header: 'No. Penjualan',
            size: 150,
        },
        {
            accessorKey: 'company_name',
            header: 'Perusahaan',
            size: 160,
        },
        {
            accessorKey: 'customer_name',
            header: 'Customer',
            size: 160,
        },
        {
            accessorKey: 'product_name',
            header: 'Nama Produk',
            size: 180,
        },
        {
            accessorKey: 'net_weight',
            header: 'Netto (Kg)',
            size: 120,
            Cell: ({ cell }) => new Intl.NumberFormat('id-ID').format(cell.getValue<number>() || 0),
        }
    ], []);

    const table = useMaterialReactTable({
        columns,
        data: prevDeliveries,
        enableRowActions: true,
        positionActionsColumn: 'last',
        displayColumnDefOptions: {
            'mrt-row-actions': {
                header: 'Aksi',
                size: 100,
            },
        },
        renderRowActions: ({ row }) => (
            <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Edit">
                    <IconButton onClick={() => handleOpenEditModal(row.original)} size="small" color="primary">
                        <EditIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Cetak Surat Jalan">
                    <IconButton onClick={() => handleReprint(row.original)} size="small" color="secondary">
                        <PrintIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>
        ),
        renderDetailPanel: ({ row }) => (
            <Box sx={{ p: 2, bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)', borderRadius: '8px' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5, color: 'primary.main' }}>
                    Rincian Muatan Truk (Stockpile)
                </Typography>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(128,128,128,0.2)', textAlign: 'left', fontWeight: 'bold' }}>
                            <th style={{ padding: '8px' }}>No. Polisi</th>
                            <th style={{ padding: '8px' }}>Produk Internal</th>
                            <th style={{ padding: '8px' }}>Tipe Produksi</th>
                            <th style={{ padding: '8px' }}>Blending</th>
                            <th style={{ padding: '8px', textAlign: 'right' }}>Gross (Kg)</th>
                            <th style={{ padding: '8px', textAlign: 'right' }}>Tare (Kg)</th>
                            <th style={{ padding: '8px', textAlign: 'right' }}>Netto (Kg)</th>
                            <th style={{ padding: '8px', textAlign: 'center' }}>Foto</th>
                        </tr>
                    </thead>
                    <tbody>
                        {row.original.items && row.original.items.length > 0 ? (
                            row.original.items.map((item: any, idx: number) => (
                                <tr key={item.id || idx} style={{ borderBottom: '1px solid rgba(128,128,128,0.1)' }}>
                                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{item.truck_plate || '-'}</td>
                                    <td style={{ padding: '8px' }}>{item.internal_product?.name || '-'}</td>
                                    <td style={{ padding: '8px' }}>{item.type_production?.nama_type || '-'}</td>
                                    <td style={{ padding: '8px' }}>{item.blending?.nama_blending || '-'}</td>
                                    <td style={{ padding: '8px', textAlign: 'right' }}>{(item.gross_weight || 0).toLocaleString('id-ID')}</td>
                                    <td style={{ padding: '8px', textAlign: 'right' }}>{(item.tare_weight || 0).toLocaleString('id-ID')}</td>
                                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{(item.net_weight || 0).toLocaleString('id-ID')}</td>
                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                        {item.photo_url ? (
                                            <a href={item.photo_url} target="_blank" rel="noopener noreferrer" style={{ color: '#A855F7', textDecoration: 'underline' }}>
                                                Lihat Foto
                                            </a>
                                        ) : '-'}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={8} style={{ padding: '8px', textAlign: 'center' }}>Tidak ada rincian truk untuk Surat Jalan ini</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </Box>
        ),
        state: {
            isLoading: tableLoading,
            showProgressBars: tableLoading,
        },
        muiTablePaperProps: {
            elevation: 0,
            sx: {
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                background: mode === 'dark'
                    ? 'rgba(0, 0, 0, 0.4)'
                    : 'rgba(255, 255, 255, 0.8)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
                overflow: 'hidden',
            },
        },
        muiTableBodyRowProps: () => ({
            sx: {
                backgroundColor: 'transparent',
                '&:hover': {
                    backgroundColor: mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.05) !important'
                        : 'rgba(0, 0, 0, 0.02) !important',
                    transform: 'scale(1.001)',
                    transition: 'all 0.2s',
                    zIndex: 1,
                },
            },
        }),
        muiTableHeadCellProps: {
            sx: {
                backgroundColor: mode === 'dark'
                    ? 'rgba(0, 0, 0, 0.6)'
                    : 'rgba(240, 247, 255, 0.8)',
                backdropFilter: 'blur(4px)',
                color: mode === 'dark' ? '#fff' : '#1e293b',
                fontWeight: 'bold',
                fontSize: '0.85rem',
            },
        },
    });

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                    <CircularProgress />
                </Box>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', background: 'linear-gradient(45deg, #6366F1 30%, #A855F7 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Pengiriman Stock Pile
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpenAddModal}
                    sx={{
                        borderRadius: '20px',
                        textTransform: 'none',
                        background: 'linear-gradient(45deg, #6366F1 30%, #A855F7 90%)',
                        boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.4)',
                    }}
                >
                    Tambah Pengiriman
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {/* Previous Deliveries History Table */}
            <Box sx={{ mb: 4 }}>
                <MaterialReactTable table={table} />
            </Box>

            {/* Reusable Form Dialog */}
            <StockpileDeliveryForm
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                deliveryOrder={editingDO}
                onSuccess={handleFormSuccess}
                deliveryType="STOCKPILE"
            />

            {/* Hidden Printing Area */}
            <Box sx={{ display: 'none', displayPrint: 'block' }}>
                <SuratJalanPrint
                    ref={printRef}
                    deliveryOrder={printDO}
                    salesOrder={printSO}
                    company={company}
                    customProductName={printCustomProductName}
                />
            </Box>

            <Snackbar
                open={!!successMsg}
                autoHideDuration={3000}
                onClose={() => setSuccessMsg(null)}
                message={successMsg}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </Container>
    );
};

export default StockpileDelivery;

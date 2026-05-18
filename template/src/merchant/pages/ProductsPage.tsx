import { FC, useState, useEffect, useCallback } from 'react'
import { Table, Button, Space, Tag, Typography } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { apiClient } from '@client/services/apiClient'
import { ProductCard } from '../components/ProductCard'
import type { Product } from '@shared/schemas'

const { Title } = Typography

export const ProductsPage: FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      // @ts-expect-error - Hono type depth limit in full template with 15+ modules; resolves in generated projects
      const response = await apiClient.api.merchant.products.$get()
      const result = await response.json()
      if (result.success === true && result.data) {
        setProducts(result.data.items)
        setTotal(result.data.total)
        setPage(result.data.page)
        setPageSize(result.data.pageSize)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `$${price.toFixed(2)}`,
    },
    {
      title: 'Stock',
      dataIndex: 'stock',
      key: 'stock',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={status === 'active' ? 'green' : 'red'}>{status}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, _record: Product) => (
        <Space size="middle">
          <Button type="link" icon={<EditOutlined />}>
            Edit
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />}>
            Delete
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2}>Products</Title>
        <Button type="primary" icon={<PlusOutlined />}>
          Add Product
        </Button>
      </div>
      <ProductCard products={products} loading={loading} />
      <Table
        dataSource={products}
        columns={columns}
        loading={loading}
        rowKey="id"
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          onChange: (newPage, newPageSize) => {
            setPage(newPage)
            setPageSize(newPageSize)
          },
        }}
      />
    </div>
  )
}

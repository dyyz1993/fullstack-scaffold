import { FC, useState, useEffect } from 'react'
import { Table, Button, Space, Tag, Typography } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { ProductCard } from '../components/ProductCard'
import type { Product } from '@shared/schemas'

const { Title } = Typography

export const ProductsPage: FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/merchant/products')
      const result = (await response.json()) as { success?: boolean; data?: Product[] }
      if (result.success === true && result.data) {
        setProducts(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

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
      <Table dataSource={products} columns={columns} loading={loading} rowKey="id" />
    </div>
  )
}

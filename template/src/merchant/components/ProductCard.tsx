import { FC } from 'react'
import { Row, Col, Card, Image, Tag, Typography } from 'antd'
import type { Product } from '@shared/schemas'

const { Title, Text, Paragraph } = Typography

interface ProductCardProps {
  products: Product[]
  loading: boolean
}

export const ProductCard: FC<ProductCardProps> = ({ products, loading }) => {
  if (loading) {
    return <div>Loading...</div>
  }

  if (products.length === 0) {
    return (
      <Card style={{ textAlign: 'center', marginBottom: 16 }}>
        <Text type="secondary">No products found</Text>
      </Card>
    )
  }

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      {products.slice(0, 4).map(product => (
        <Col span={6} key={product.id}>
          <Card
            hoverable
            cover={
              product.imageUrl ? (
                <Image
                  alt={product.name}
                  src={product.imageUrl}
                  height={200}
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    height: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f0f0f0',
                  }}
                >
                  <Text type="secondary">No Image</Text>
                </div>
              )
            }
          >
            <Title level={5} ellipsis={{ rows: 2 }}>
              {product.name}
            </Title>
            <Paragraph ellipsis={{ rows: 2 }} type="secondary">
              {product.description}
            </Paragraph>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 12,
              }}
            >
              <Text strong style={{ fontSize: 16 }}>
                ${product.price.toFixed(2)}
              </Text>
              <Tag color={product.status === 'active' ? 'green' : 'red'}>{product.status}</Tag>
            </div>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">Stock: {product.stock}</Text>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  )
}

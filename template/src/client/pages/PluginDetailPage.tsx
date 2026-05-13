import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  ArrowLeft,
  Download,
  Star,
  ExternalLink,
  Tag,
  Terminal,
  User,
  Calendar,
  Package,
} from 'lucide-react'
import { usePluginStore } from '@client/stores/pluginStore'
import { LoadingSpinner, StatusBadge } from '@client/components'
import type { CreateReviewInput } from '@shared/schemas'

export const PluginDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const currentPlugin = usePluginStore(state => state.currentPlugin)
  const reviews = usePluginStore(state => state.reviews)
  const loading = usePluginStore(state => state.loading)
  const error = usePluginStore(state => state.error)
  const fetchPlugin = usePluginStore(state => state.fetchPlugin)
  const fetchReviews = usePluginStore(state => state.fetchReviews)
  const trackInstall = usePluginStore(state => state.trackInstall)
  const submitReview = usePluginStore(state => state.submitReview)
  const clearCurrentPlugin = usePluginStore(state => state.clearCurrentPlugin)

  const [reviewForm, setReviewForm] = useState<CreateReviewInput>({
    rating: 5,
    title: '',
    content: '',
  })
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    if (slug) {
      fetchPlugin(slug)
      fetchReviews(slug)
    }
    return () => clearCurrentPlugin()
  }, [slug, fetchPlugin, fetchReviews, clearCurrentPlugin])

  const handleInstall = async () => {
    if (slug) {
      await trackInstall(slug)
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slug) return
    setSubmittingReview(true)
    await submitReview(slug, reviewForm)
    setSubmittingReview(false)
    setReviewForm({ rating: 5, title: '', content: '' })
  }

  if (loading && !currentPlugin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  if (error && !currentPlugin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
        <Link
          to="/plugins"
          className="mt-4 inline-flex items-center gap-1 text-blue-500 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Plugins
        </Link>
      </div>
    )
  }

  if (!currentPlugin) return null

  const statusColors: Record<string, 'green' | 'yellow' | 'red'> = {
    approved: 'green',
    pending: 'yellow',
    rejected: 'red',
  }

  const avgRating =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0

  return (
    <div className="max-w-4xl mx-auto p-6" data-testid="plugin-detail-page">
      <Helmet>
        <title>{currentPlugin.name} - Plugin Marketplace</title>
        <meta name="description" content={currentPlugin.description} />
      </Helmet>

      <Link
        to="/plugins"
        className="inline-flex items-center gap-1 text-blue-500 hover:underline mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Plugins
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{currentPlugin.name}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {currentPlugin.authorName}
              </span>
              <span className="flex items-center gap-1">
                <Package className="w-4 h-4" />v{currentPlugin.version}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(currentPlugin.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge
              label={currentPlugin.status}
              colorScheme={statusColors[currentPlugin.status] || 'gray'}
            />
            {currentPlugin.featured && <StatusBadge label="Featured" colorScheme="purple" />}
          </div>
        </div>

        <p className="mt-4 text-gray-700 leading-relaxed">{currentPlugin.description}</p>

        {currentPlugin.tags && currentPlugin.tags.length > 0 && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <Tag className="w-4 h-4 text-gray-400" />
            {currentPlugin.tags.map(tag => (
              <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Download className="w-4 h-4" />
            {currentPlugin.downloadCount} downloads
          </span>
          <span className="flex items-center gap-1">
            <Star className="w-4 h-4" />
            {avgRating.toFixed(1)} ({reviews.length} reviews)
          </span>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleInstall}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            <Download className="w-4 h-4" />
            Install
          </button>
          {currentPlugin.repositoryUrl && (
            <a
              href={currentPlugin.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Repository
            </a>
          )}
          {currentPlugin.homepageUrl && (
            <a
              href={currentPlugin.homepageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Homepage
            </a>
          )}
        </div>

        {currentPlugin.commands && currentPlugin.commands.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              Commands
            </h2>
            <div className="mt-3 space-y-2">
              {currentPlugin.commands.map((cmd, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <code className="text-sm font-mono text-blue-600">{cmd.name}</code>
                  {cmd.description && (
                    <span className="text-sm text-gray-500">{cmd.description}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {currentPlugin.license && (
          <div className="mt-6 text-sm text-gray-500">License: {currentPlugin.license}</div>
        )}
      </div>

      <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <Star className="w-5 h-5" />
          Reviews ({reviews.length})
        </h2>

        {reviews.length > 0 ? (
          <div className="mt-4 space-y-4">
            {reviews.map(review => (
              <div key={review.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{review.userName}</span>
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {review.title && <h4 className="mt-2 font-medium text-gray-800">{review.title}</h4>}
                {review.content && <p className="mt-1 text-sm text-gray-600">{review.content}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-gray-400 text-sm">No reviews yet. Be the first to review!</p>
        )}

        <form onSubmit={handleSubmitReview} className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-md font-medium text-gray-900 mb-4">Write a Review</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setReviewForm(prev => ({ ...prev, rating: i + 1 }))}
                >
                  <Star
                    className={`w-6 h-6 cursor-pointer transition-colors ${
                      i < reviewForm.rating
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300 hover:text-yellow-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <input
              type="text"
              value={reviewForm.title ?? ''}
              onChange={e => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Review title (optional)"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
          </div>
          <div className="mb-4">
            <textarea
              value={reviewForm.content ?? ''}
              onChange={e => setReviewForm(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Write your review... (optional)"
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={submittingReview}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {submittingReview ? <LoadingSpinner size="sm" color="text-white" /> : 'Submit Review'}
          </button>
        </form>
      </div>
    </div>
  )
}

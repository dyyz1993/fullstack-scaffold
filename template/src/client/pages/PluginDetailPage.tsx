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
  Shield,
  Globe,
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
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-50">
        <div className="flex items-center justify-center py-32">
          <LoadingSpinner size="lg" color="text-white" />
        </div>
      </div>
    )
  }

  if (error && !currentPlugin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-50 px-6 pt-12">
        <div className="max-w-4xl mx-auto">
          <div className="p-5 bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl backdrop-blur-sm">
            {error}
          </div>
          <Link
            to="/plugins"
            className="mt-4 inline-flex items-center gap-2 text-purple-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Plugins
          </Link>
        </div>
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
    <div className="min-h-screen" data-testid="plugin-detail-page">
      <Helmet>
        <title>{currentPlugin.name} - Plugin Marketplace</title>
        <meta name="description" content={currentPlugin.description} />
      </Helmet>

      <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-8 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <Link
            to="/plugins"
            className="inline-flex items-center gap-2 text-purple-300 hover:text-white transition-colors mb-8 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </Link>

          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-violet-500/30 shrink-0">
              {currentPlugin.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  {currentPlugin.name}
                </h1>
                <StatusBadge
                  label={currentPlugin.status}
                  colorScheme={statusColors[currentPlugin.status] || 'gray'}
                />
                {currentPlugin.featured && <StatusBadge label="Featured" colorScheme="purple" />}
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm text-purple-200/60 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  {currentPlugin.authorName}
                </span>
                <span className="flex items-center gap-1.5">
                  <Package className="w-4 h-4" />v{currentPlugin.version}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {new Date(currentPlugin.createdAt).toLocaleDateString()}
                </span>
                {currentPlugin.license && (
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4" />
                    {currentPlugin.license}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3 flex-wrap">
            <button
              onClick={handleInstall}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 font-semibold"
            >
              <Download className="w-5 h-5" />
              Install Plugin
            </button>
            {currentPlugin.repositoryUrl && (
              <a
                href={currentPlugin.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all text-sm backdrop-blur-sm border border-white/10"
              >
                <Globe className="w-4 h-4" />
                Repository
              </a>
            )}
            {currentPlugin.homepageUrl && (
              <a
                href={currentPlugin.homepageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all text-sm backdrop-blur-sm border border-white/10"
              >
                <ExternalLink className="w-4 h-4" />
                Homepage
              </a>
            )}
          </div>

          <div className="mt-6 flex items-center gap-6 text-sm text-purple-200/50">
            <span className="flex items-center gap-1.5">
              <Download className="w-4 h-4" />
              <span className="text-white font-semibold">{currentPlugin.downloadCount}</span>{' '}
              downloads
            </span>
            <span className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-white font-semibold">{avgRating.toFixed(1)}</span>
              <span>({reviews.length} reviews)</span>
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-8 pb-16">
        <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-gray-100 p-8">
          <p className="text-gray-600 leading-relaxed text-base">{currentPlugin.description}</p>

          {currentPlugin.tags && currentPlugin.tags.length > 0 && (
            <div className="mt-6 flex items-center gap-2 flex-wrap">
              {currentPlugin.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-violet-50 to-fuchsia-50 text-violet-700 rounded-lg text-sm font-medium"
                >
                  <Tag className="w-3.5 h-3.5 opacity-60" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {currentPlugin.commands && currentPlugin.commands.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Terminal className="w-5 h-5 text-violet-500" />
                Commands
              </h2>
              <div className="space-y-2">
                {currentPlugin.commands.map((cmd, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100"
                  >
                    <code className="text-sm font-mono text-violet-600 font-semibold bg-violet-50 px-2 py-0.5 rounded">
                      {cmd.name}
                    </code>
                    {cmd.description && (
                      <span className="text-sm text-gray-500">{cmd.description}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 bg-white rounded-2xl shadow-xl shadow-black/5 border border-gray-100 p-8">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-6">
            <Star className="w-5 h-5 text-yellow-400" />
            Reviews ({reviews.length})
          </h2>

          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map(review => (
                <div key={review.id} className="p-5 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white text-sm font-bold">
                        {review.userName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-gray-900">{review.userName}</span>
                      <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {review.title && (
                    <h4 className="mt-3 font-semibold text-gray-800">{review.title}</h4>
                  )}
                  {review.content && (
                    <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{review.content}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No reviews yet. Be the first to review!</p>
          )}

          <form onSubmit={handleSubmitReview} className="mt-8 pt-8 border-t border-gray-100">
            <h3 className="text-base font-semibold text-gray-900 mb-5">Write a Review</h3>
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-600 mb-2">Rating</label>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setReviewForm(prev => ({ ...prev, rating: i + 1 }))}
                  >
                    <Star
                      className={`w-7 h-7 cursor-pointer transition-all ${
                        i < reviewForm.rating
                          ? 'text-yellow-400 fill-yellow-400 scale-110'
                          : 'text-gray-200 hover:text-yellow-300 hover:scale-105'
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
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm transition-all"
              />
            </div>
            <div className="mb-5">
              <textarea
                value={reviewForm.content ?? ''}
                onChange={e => setReviewForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write your review... (optional)"
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm resize-none transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={submittingReview}
              className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl hover:from-violet-400 hover:to-fuchsia-400 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all text-sm font-semibold shadow-md shadow-violet-500/15"
            >
              {submittingReview ? <LoadingSpinner size="sm" color="text-white" /> : 'Submit Review'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

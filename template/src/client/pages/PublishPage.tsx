import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Upload, Plus, X, Rocket } from 'lucide-react'
import { usePluginStore } from '@client/stores/pluginStore'
import { LoadingSpinner } from '@client/components'
import type { CreatePluginInput } from '@shared/schemas'

export const PublishPage: React.FC = () => {
  const loading = usePluginStore(state => state.loading)
  const error = usePluginStore(state => state.error)
  const createPlugin = usePluginStore(state => state.createPlugin)
  const clearError = usePluginStore(state => state.clearError)

  const navigate = useNavigate()

  const [form, setForm] = useState<CreatePluginInput>({
    name: '',
    slug: '',
    description: '',
    repositoryUrl: undefined,
    homepageUrl: undefined,
    npmPackage: undefined,
    license: undefined,
    tags: [],
    commands: [],
  })
  const [tagInput, setTagInput] = useState('')
  const [commandName, setCommandName] = useState('')
  const [commandDesc, setCommandDesc] = useState('')

  const handleAddTag = () => {
    if (tagInput.trim() && !(form.tags || []).includes(tagInput.trim())) {
      setForm(prev => ({ ...prev, tags: [...(prev.tags || []), tagInput.trim()] }))
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setForm(prev => ({ ...prev, tags: (prev.tags || []).filter(t => t !== tag) }))
  }

  const handleAddCommand = () => {
    if (commandName.trim()) {
      setForm(prev => ({
        ...prev,
        commands: [
          ...(prev.commands || []),
          { name: commandName.trim(), description: commandDesc.trim() || undefined },
        ],
      }))
      setCommandName('')
      setCommandDesc('')
    }
  }

  const handleRemoveCommand = (index: number) => {
    setForm(prev => ({
      ...prev,
      commands: (prev.commands || []).filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearError()
    const slug = await createPlugin(form)
    if (slug) {
      navigate(`/plugins/${slug}`)
    }
  }

  return (
    <div className="min-h-screen" data-testid="publish-page">
      <Helmet>
        <title>Publish Plugin - Plugin Marketplace</title>
        <meta name="description" content="Publish a new plugin to the marketplace" />
      </Helmet>

      <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-12 pb-20 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl shadow-lg shadow-violet-500/25">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Publish Plugin</h1>
          </div>
          <p className="text-purple-200/70 text-lg">Share your creation with the community</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 -mt-8 pb-16">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-2xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-gray-100 p-7 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-gradient-to-b from-violet-500 to-fuchsia-500 rounded-full" />
              Basic Information
            </h2>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Plugin Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My Awesome Plugin"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Slug <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={e =>
                  setForm(prev => ({
                    ...prev,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                  }))
                }
                placeholder="my-awesome-plugin"
                required
                pattern="^[a-z0-9-]+$"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm font-mono transition-all"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Lowercase letters, numbers, and hyphens only
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what your plugin does..."
                required
                rows={4}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm resize-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Repository URL
                </label>
                <input
                  type="url"
                  value={form.repositoryUrl || ''}
                  onChange={e =>
                    setForm(prev => ({
                      ...prev,
                      repositoryUrl: e.target.value || undefined,
                    }))
                  }
                  placeholder="https://github.com/..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Homepage URL
                </label>
                <input
                  type="url"
                  value={form.homepageUrl || ''}
                  onChange={e =>
                    setForm(prev => ({
                      ...prev,
                      homepageUrl: e.target.value || undefined,
                    }))
                  }
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  NPM Package
                </label>
                <input
                  type="text"
                  value={form.npmPackage || ''}
                  onChange={e =>
                    setForm(prev => ({ ...prev, npmPackage: e.target.value || undefined }))
                  }
                  placeholder="@scope/package-name"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">License</label>
                <input
                  type="text"
                  value={form.license || ''}
                  onChange={e =>
                    setForm(prev => ({ ...prev, license: e.target.value || undefined }))
                  }
                  placeholder="MIT"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm transition-all"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-gray-100 p-7 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-gradient-to-b from-violet-500 to-fuchsia-500 rounded-full" />
              Tags
            </h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add a tag..."
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm transition-all"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="p-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-sm"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            {form.tags && form.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {form.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-50 to-fuchsia-50 text-violet-700 rounded-lg text-sm font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-gray-100 p-7 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-gradient-to-b from-violet-500 to-fuchsia-500 rounded-full" />
              Commands
            </h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={commandName}
                onChange={e => setCommandName(e.target.value)}
                placeholder="Command name"
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm transition-all"
              />
              <input
                type="text"
                value={commandDesc}
                onChange={e => setCommandDesc(e.target.value)}
                placeholder="Description (optional)"
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm transition-all"
              />
              <button
                type="button"
                onClick={handleAddCommand}
                className="p-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-sm"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            {form.commands && form.commands.length > 0 && (
              <div className="space-y-2">
                {form.commands.map((cmd, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100"
                  >
                    <code className="text-sm font-mono text-violet-600 font-semibold bg-violet-50 px-2 py-0.5 rounded">
                      {cmd.name}
                    </code>
                    {cmd.description && (
                      <span className="text-sm text-gray-500">{cmd.description}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveCommand(i)}
                      className="ml-auto p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !form.name || !form.slug || !form.description}
            className="w-full py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-2xl hover:from-violet-400 hover:to-fuchsia-400 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all font-semibold text-base flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
          >
            {loading ? (
              <LoadingSpinner size="sm" color="text-white" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
            Publish Plugin
          </button>
        </form>
      </div>
    </div>
  )
}

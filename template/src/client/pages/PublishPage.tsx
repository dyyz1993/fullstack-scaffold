import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Upload, Plus, X } from 'lucide-react'
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
    <div className="max-w-2xl mx-auto p-6" data-testid="publish-page">
      <Helmet>
        <title>Publish Plugin - Plugin Marketplace</title>
        <meta name="description" content="Publish a new plugin to the marketplace" />
      </Helmet>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Upload className="w-8 h-8 text-blue-500" />
          Publish Plugin
        </h1>
        <p className="text-gray-500 mt-2">Submit a new plugin to the marketplace</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plugin Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="My Awesome Plugin"
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug <span className="text-red-500">*</span>
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
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">
              Lowercase letters, numbers, and hyphens only
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what your plugin does..."
              required
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Repository URL</label>
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Homepage URL</label>
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NPM Package</label>
              <input
                type="text"
                value={form.npmPackage || ''}
                onChange={e =>
                  setForm(prev => ({ ...prev, npmPackage: e.target.value || undefined }))
                }
                placeholder="@scope/package-name"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License</label>
              <input
                type="text"
                value={form.license || ''}
                onChange={e => setForm(prev => ({ ...prev, license: e.target.value || undefined }))}
                placeholder="MIT"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="text-md font-medium text-gray-900">Tags</h3>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              placeholder="Add a tag..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          {form.tags && form.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {form.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-sm"
                >
                  {tag}
                  <button type="button" onClick={() => handleRemoveTag(tag)}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="text-md font-medium text-gray-900">Commands</h3>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={commandName}
              onChange={e => setCommandName(e.target.value)}
              placeholder="Command name"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
            <input
              type="text"
              value={commandDesc}
              onChange={e => setCommandDesc(e.target.value)}
              placeholder="Description (optional)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
            <button
              type="button"
              onClick={handleAddCommand}
              className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          {form.commands && form.commands.length > 0 && (
            <div className="space-y-2">
              {form.commands.map((cmd, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <code className="text-sm font-mono text-blue-600">{cmd.name}</code>
                  {cmd.description && (
                    <span className="text-sm text-gray-500">{cmd.description}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveCommand(i)}
                    className="ml-auto p-1 text-gray-400 hover:text-red-500"
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
          className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
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
  )
}

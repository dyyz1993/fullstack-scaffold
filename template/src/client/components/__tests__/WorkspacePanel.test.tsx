import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WorkspacePanel } from '../WorkspacePanel'

const mockUseAgentStore = vi.fn(() => ({
  workspace: null,
}))

const mockUseWorkspaceStore = vi.fn(() => ({
  files: null,
  loadingFiles: false,
  totalFiles: 0,
  totalDirectories: 0,
  totalSize: 0,
  fetchFiles: vi.fn(),
  setSelectedFile: vi.fn(),
}))

vi.mock('../../stores/agentStore', () => ({
  useAgentStore: mockUseAgentStore,
}))

vi.mock('../../stores/workspaceStore', () => ({
  useWorkspaceStore: mockUseWorkspaceStore,
}))

vi.mock('@client/services/LanguagePackManager', () => ({
  languagePackManager: {
    preloadLanguages: vi.fn(),
  },
}))

describe('WorkspacePanel', () => {
  it('should be defined', () => {
    expect(WorkspacePanel).toBeDefined()
  })

  it('should render without crashing', () => {
    expect(() => render(<WorkspacePanel />)).not.toThrow()
  })

  it('should show default workspace name when no workspace', () => {
    render(<WorkspacePanel />)
    expect(screen.getByText('Workspace')).toBeInTheDocument()
  })
})

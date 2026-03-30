import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WorkspacePanel } from '../WorkspacePanel'

// vi.hoisted ensures these are initialized before vi.mock factory functions run
const { mockUseAgentStore, mockUseWorkspaceStore } = vi.hoisted(() => {
  const agentStoreState = {
    workspace: null,
  }

  const workspaceStoreState = {
    files: null,
    loadingFiles: false,
    totalFiles: 0,
    totalDirectories: 0,
    totalSize: 0,
    fetchFiles: vi.fn(),
    setSelectedFile: vi.fn(),
  }

  // Zustand stores are called with a selector: useStore(state => state.someField)
  // When no selector is passed, they return the full state object.
  const mockAgentStore = vi.fn((selector?: (state: typeof agentStoreState) => unknown) => {
    if (selector) return selector(agentStoreState)
    return agentStoreState
  })

  const mockWorkspaceStore = vi.fn((selector?: (state: typeof workspaceStoreState) => unknown) => {
    if (selector) return selector(workspaceStoreState)
    return workspaceStoreState
  })

  return {
    mockUseAgentStore: mockAgentStore,
    mockUseWorkspaceStore: mockWorkspaceStore,
  }
})

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

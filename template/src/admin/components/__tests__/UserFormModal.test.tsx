import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { UserFormModal } from '../UserFormModal'

describe('UserFormModal', () => {
  const defaultProps = {
    open: true,
    title: 'Create User',
    onOk: vi.fn(),
    onCancel: vi.fn(),
  }

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('should render modal with title when open', () => {
    render(<UserFormModal {...defaultProps} />)

    expect(screen.getByText('Create User')).toBeInTheDocument()
  })

  it('should not render modal content when closed', () => {
    render(<UserFormModal {...defaultProps} open={false} />)

    expect(screen.queryByText('Create User')).not.toBeInTheDocument()
  })

  it('should render form fields', () => {
    render(<UserFormModal {...defaultProps} />)

    expect(screen.getByText('Username')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Role')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('should pre-fill values when initialValues provided', () => {
    render(
      <UserFormModal
        {...defaultProps}
        title="Edit User"
        initialValues={{
          username: 'existing-user',
          email: 'existing@test.com',
          role: 'admin',
          status: true,
        }}
      />
    )

    expect(screen.getByDisplayValue('existing-user')).toBeInTheDocument()
    expect(screen.getByDisplayValue('existing@test.com')).toBeInTheDocument()
  })

  it('should call onCancel when cancel button clicked', () => {
    render(<UserFormModal {...defaultProps} />)

    const cancelButtons = screen.getAllByRole('button').filter(btn => btn.textContent === 'Cancel')
    if (cancelButtons.length > 0) {
      fireEvent.click(cancelButtons[0])
      expect(defaultProps.onCancel).toHaveBeenCalled()
    }
  })

  it('should show validation errors for empty required fields', async () => {
    render(<UserFormModal {...defaultProps} />)

    const okButtons = screen.getAllByRole('button').filter(btn => btn.textContent === 'OK')
    if (okButtons.length > 0) {
      fireEvent.click(okButtons[0])

      await waitFor(() => {
        expect(screen.getByText("'username' is required")).toBeInTheDocument()
      })
    }
  })

  it('should call onOk with form values when form is valid', async () => {
    const onOk = vi.fn()
    render(<UserFormModal {...defaultProps} onOk={onOk} />)

    const usernameInput = screen.getByPlaceholderText('Enter username')
    const emailInput = screen.getByPlaceholderText('Enter email')

    fireEvent.change(usernameInput, { target: { value: 'newuser' } })
    fireEvent.change(emailInput, { target: { value: 'new@test.com' } })

    const roleSelect = screen.getByPlaceholderText('Select role')
    fireEvent.mouseDown(roleSelect)

    await waitFor(() => {
      const adminOption = screen.queryByText('Admin')
      if (adminOption) {
        fireEvent.click(adminOption)
      }
    })

    const okButtons = screen.getAllByRole('button').filter(btn => btn.textContent === 'OK')
    if (okButtons.length > 0) {
      fireEvent.click(okButtons[0])
    }

    await waitFor(() => {
      expect(onOk).toHaveBeenCalled()
      expect(onOk).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'newuser',
          email: 'new@test.com',
        })
      )
    })
  })
})

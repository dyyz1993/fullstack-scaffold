import { App } from 'antd'

export function useMessage() {
  const { message } = App.useApp()
  return message
}

export function useModal() {
  const { modal } = App.useApp()
  return modal
}

export function useNotification() {
  const { notification } = App.useApp()
  return notification
}

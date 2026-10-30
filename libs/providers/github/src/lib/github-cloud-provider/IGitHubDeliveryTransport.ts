/** Account-scoped transport supplied by the existing governed GitHub adapter. */
export interface IGitHubDeliveryTransport {
  request<T>(
    repositoryBindingId: string,
    path: string,
    method: 'GET' | 'POST',
    fields?: Readonly<Record<string, string | number | boolean>>,
  ): Promise<T>;
}

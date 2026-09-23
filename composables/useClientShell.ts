/**
 * Guest shell state: pages under /m set venue + table for the client layout header.
 */
export function useClientShell() {
  const venueName = useState<string>("client-venue-name", () => "Menu")
  const tableNumber = useState<number | null>("client-table-number", () => null)

  function setShell(options: {
    venueName?: string
    tableNumber?: number | null
  }) {
    if (options.venueName !== undefined) {
      venueName.value = options.venueName
    }
    if (options.tableNumber !== undefined) {
      tableNumber.value = options.tableNumber
    }
  }

  return {
    venueName,
    tableNumber,
    setShell,
  }
}

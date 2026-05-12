import { useEffect, useState } from "react"

interface ExchangeRates {
  [currency: string]: number
}

interface StorageData {
  baseCurrency: string
  amount: string
  targetCurrencies: string[]
}

const STORAGE_KEY = "exchange-rate-config"
const CURRENCIES_API =
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies.min.json"
const CURRENCIES_API_FALLBACK =
  "https://latest.currency-api.pages.dev/v1/currencies.min.json"

const t = (key: string) => globalThis.chrome?.i18n?.getMessage(key) || key

function IndexPopup() {
  const [baseCurrency, setBaseCurrency] = useState("usd")
  const [amount, setAmount] = useState("1")
  const [targetCurrencies, setTargetCurrencies] = useState<string[]>([
    "cny",
    "eur",
    "jpy"
  ])
  const [rates, setRates] = useState<ExchangeRates>({})
  const [currenciesList, setCurrenciesList] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [rateDate, setRateDate] = useState("")
  const [refreshToken, setRefreshToken] = useState(0)

  // 从 localStorage 恢复配置
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const data: StorageData = JSON.parse(saved)
        setBaseCurrency(data.baseCurrency)
        setAmount(data.amount)
        setTargetCurrencies(data.targetCurrencies)
      } catch (e) {
        console.error("Failed to parse saved config:", e)
      }
    }
  }, [])

  // 保存配置到 localStorage
  const saveConfig = (base: string, amt: string, targets: string[]) => {
    const data: StorageData = {
      baseCurrency: base,
      amount: amt,
      targetCurrencies: targets
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  // 从 API 获取数据（支持 fallback）
  const fetchFromAPI = async (
    url: string,
    fallbackUrl?: string
  ): Promise<any> => {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (err) {
      if (fallbackUrl) {
        try {
          const response = await fetch(fallbackUrl)
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          return await response.json()
        } catch (fallbackErr) {
          throw new Error(
            `Primary and fallback APIs failed: ${err}, ${fallbackErr}`
          )
        }
      }
      throw err
    }
  }

  // 获取货币列表
  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const data = await fetchFromAPI(CURRENCIES_API, CURRENCIES_API_FALLBACK)
        const source =
          data && typeof data === "object" && data.currencies
            ? data.currencies
            : data
        const currencyCodes = Object.keys(source || {}).sort()
        setCurrenciesList(currencyCodes)
      } catch (err) {
        console.error("Failed to load currencies:", err)
        setError("errorLoadCurrencyList")
      }
    }

    loadCurrencies()
  }, [])

  // 获取汇率数据
  useEffect(() => {
    const loadRates = async () => {
      if (!baseCurrency) return

      setLoading(true)
      setError("")
      try {
        const primaryUrl = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${baseCurrency.toLowerCase()}.min.json`
        const fallbackUrl = `https://latest.currency-api.pages.dev/v1/currencies/${baseCurrency.toLowerCase()}.min.json`

        const data = await fetchFromAPI(primaryUrl, fallbackUrl)

        const ratesData = data[baseCurrency.toLowerCase()] || {}
        setRates(ratesData)
        setRateDate(typeof data.date === "string" ? data.date : "")
      } catch (err) {
        console.error("Failed to load exchange rates:", err)
        setError("errorLoadExchangeRates")
        setRates({})
        setRateDate("")
      } finally {
        setLoading(false)
      }
    }

    loadRates()
  }, [baseCurrency, refreshToken])

  const handleBaseCurrencyChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newBase = e.target.value
    setBaseCurrency(newBase)
    saveConfig(newBase, amount, targetCurrencies)
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAmount = e.target.value
    setAmount(newAmount)
    saveConfig(baseCurrency, newAmount, targetCurrencies)
  }

  const addTargetCurrency = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value
    if (
      selected &&
      !targetCurrencies.includes(selected) &&
      selected.toLowerCase() !== baseCurrency.toLowerCase()
    ) {
      const newTargets = [...targetCurrencies, selected]
      setTargetCurrencies(newTargets)
      saveConfig(baseCurrency, amount, newTargets)
    }
    e.target.value = ""
  }

  const removeTargetCurrency = (currency: string) => {
    const newTargets = targetCurrencies.filter((c) => c !== currency)
    setTargetCurrencies(newTargets)
    saveConfig(baseCurrency, amount, newTargets)
  }

  const convertAmount = (currency: string): string => {
    const numAmount = parseFloat(amount) || 0
    const rate = rates[currency.toLowerCase()] || 0
    if (rate === 0) return "-"
    const result = numAmount * rate
    return result.toFixed(4)
  }

  const availableForAdd = currenciesList.filter(
    (c) =>
      !targetCurrencies.includes(c) &&
      c.toLowerCase() !== baseCurrency.toLowerCase()
  )

  const handleRefreshRates = () => {
    setRefreshToken((prev) => prev + 1)
  }

  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "16px",
        width: "500px",
        backgroundColor: "#f8f9fa",
        borderRadius: "8px"
      }}>
      <h2 style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#333" }}>
        {t("popupTitle")}
      </h2>

      {error && (
        <div
          style={{
            padding: "8px",
            marginBottom: "12px",
            backgroundColor: "#ffe0e0",
            color: "#c41e3a",
            borderRadius: "4px",
            fontSize: "12px"
          }}>
          {t(error)}
        </div>
      )}

      {/* 主货币和金额 */}
      <div
        style={{
          marginBottom: "16px",
          padding: "12px",
          backgroundColor: "white",
          borderRadius: "6px",
          border: "1px solid #ddd"
        }}>
        <div style={{ marginBottom: "12px" }}>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              marginBottom: "4px",
              color: "#666"
            }}>
            {t("amountLabel")}
          </label>
          <input
            type="number"
            value={amount}
            onChange={handleAmountChange}
            placeholder={t("amountPlaceholder")}
            step="0.01"
            min="0"
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "14px",
              boxSizing: "border-box"
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              marginBottom: "4px",
              color: "#666"
            }}>
            {t("baseCurrencyLabel")}
          </label>
          <select
            value={baseCurrency}
            onChange={handleBaseCurrencyChange}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "14px",
              boxSizing: "border-box",
              cursor: "pointer"
            }}>
            {currenciesList.map((curr) => (
              <option key={curr} value={curr}>
                {curr.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            marginTop: "10px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
          <span style={{ fontSize: "12px", color: "#666" }}>
            {t("rateDateLabel")}: {rateDate || "-"}
          </span>
          <button
            onClick={handleRefreshRates}
            disabled={loading}
            style={{
              padding: "4px 10px",
              border: "1px solid #d0d7de",
              borderRadius: "4px",
              backgroundColor: loading ? "#f3f4f6" : "#fff",
              color: "#333",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "12px"
            }}>
            {loading ? t("refreshingRates") : t("refreshRates")}
          </button>
        </div>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div
          style={{
            textAlign: "center",
            color: "#999",
            fontSize: "12px",
            marginBottom: "12px"
          }}>
          {t("loading")}
        </div>
      )}

      {/* 目标货币列表 */}
      <div
        style={{
          marginBottom: "16px",
          padding: "12px",
          backgroundColor: "white",
          borderRadius: "6px",
          border: "1px solid #ddd"
        }}>
        <label
          style={{
            display: "block",
            fontSize: "12px",
            marginBottom: "8px",
            color: "#666",
            fontWeight: "bold"
          }}>
          {t("conversionResultsLabel")}
        </label>

        {targetCurrencies.length === 0 ? (
          <div style={{ fontSize: "12px", color: "#999" }}>
            {t("noTargetCurrencies")}
          </div>
        ) : (
          <div>
            {targetCurrencies.map((curr) => (
              <div
                key={curr}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "1px solid #f0f0f0",
                  fontSize: "13px"
                }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: "600", marginRight: "12px" }}>
                    {curr.toUpperCase()}
                  </span>
                  <span style={{ color: "#666" }}>
                    1 {baseCurrency.toUpperCase()} ={" "}
                    {rates[curr.toLowerCase()]?.toFixed(4) || "-"}{" "}
                    {curr.toUpperCase()}
                  </span>
                </div>
                <div
                  style={{
                    marginRight: "12px",
                    fontWeight: "600",
                    minWidth: "80px",
                    textAlign: "right",
                    color: "#2563eb"
                  }}>
                  {convertAmount(curr)}
                </div>
                <button
                  onClick={() => removeTargetCurrency(curr)}
                  style={{
                    padding: "4px 8px",
                    backgroundColor: "#fee",
                    color: "#c41e3a",
                    border: "1px solid #fcc",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "500"
                  }}>
                  {t("deleteButton")}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 添加目标货币 */}
      <div
        style={{
          padding: "12px",
          backgroundColor: "white",
          borderRadius: "6px",
          border: "1px solid #ddd"
        }}>
        <label
          style={{
            display: "block",
            fontSize: "12px",
            marginBottom: "8px",
            color: "#666"
          }}>
          {t("addCurrencyLabel")}
        </label>
        <select
          onChange={addTargetCurrency}
          defaultValue=""
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px",
            boxSizing: "border-box",
            cursor: "pointer"
          }}>
          <option value="">{t("selectCurrencyPlaceholder")}</option>
          {availableForAdd.map((curr) => (
            <option key={curr} value={curr}>
              {curr.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          fontSize: "11px",
          color: "#999",
          marginTop: "12px",
          textAlign: "center"
        }}>
        {t("dataSourceNotice")}
      </div>
    </div>
  )
}

export default IndexPopup

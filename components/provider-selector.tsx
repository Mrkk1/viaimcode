"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// Import only the icons that are actually used
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { LLMProvider } from "@/lib/providers/config"

interface Provider {
  id: LLMProvider
  name: string
  description: string
  isLocal: boolean
}

interface ProviderSelectorProps {
  selectedProvider: string
  setSelectedProvider: (value: string) => void
  onProviderChange: () => void
}

export function ProviderSelector({
  selectedProvider,
  setSelectedProvider,
  onProviderChange
}: ProviderSelectorProps) {
  const [providers, setProviders] = useState<Provider[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchProviders = async () => {
      setIsLoading(true)
      try {
        // Get the providers
        const response = await fetch('/api/get-models', {
          method: 'POST',
        })
        if (!response.ok) {
          throw new Error('Error fetching providers')
        }
        const data = await response.json()
        setProviders(data)

        // If no provider is selected, get the default provider
        if (!selectedProvider && data.length > 0) {
          try {
            // Get the default provider from the API
            const defaultResponse = await fetch('/api/get-default-provider')
            if (defaultResponse.ok) {
              const { defaultProvider } = await defaultResponse.json()

              // Check if the default provider is in the list of available providers
              const providerExists = data.some(p => p.id === defaultProvider)

              if (providerExists) {
                setSelectedProvider(defaultProvider)
              } else {
                // Fallback to the first provider if the default provider is not available
                setSelectedProvider(data[0].id)
              }
            } else {
              // Fallback to the first provider on error
              setSelectedProvider(data[0].id)
            }
          } catch (error) {
            console.error('Error fetching default provider:', error)
            // Fallback to the first provider on error
            setSelectedProvider(data[0].id)
          }
        }
      } catch (error) {
        console.error('Error fetching providers:', error)
        toast.error('Providers could not be loaded.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProviders()
  }, [selectedProvider, setSelectedProvider])

  const handleProviderChange = (value: string) => {
    setSelectedProvider(value)
    onProviderChange()
  }

  return (
    <div className="w-full mb-6">
      <label className="block text-sm font-medium text-gray-300 mb-2">SELECT PROVIDER</label>
      <Select value={selectedProvider} onValueChange={handleProviderChange}>
        <SelectTrigger className="w-full bg-gray-900/80 border-gray-800 focus:border-white focus:ring-white text-white">
          <SelectValue placeholder="Choose an AI provider..." />
        </SelectTrigger>
        <SelectContent className="bg-gray-900 border-gray-800 text-white">
          {isLoading ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              <span>Loading providers...</span>
            </div>
          ) : providers.length > 0 ? (
            providers.map((provider) => (
              <SelectItem key={provider.id} value={provider.id}>
                <div className="flex flex-col">
                  <span>{provider.name}</span>
                  <span className="text-xs text-gray-400">{provider.description}</span>
                  {provider.examples && provider.examples.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {provider.examples.map((example, index) => (
                        <span key={index} className="inline-flex items-center rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-300">
                          {example}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </SelectItem>
            ))
          ) : (
            <div className="p-2 text-sm text-gray-400">
              No providers available
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  )
}

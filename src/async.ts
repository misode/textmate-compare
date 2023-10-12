import { Inputs, useEffect, useState } from "preact/hooks"

export function useAsync<T>(fn: () => Promise<T>, inputs?: Inputs) {
	const [data, setData] = useState<T>()

	useEffect(() => {
		fn().then(setData)
	}, inputs ?? [])

	return data
}

import { useEffect, useState } from 'preact/hooks'
import * as textmate from 'vscode-textmate'
import * as oniguruma from 'vscode-oniguruma'
import onigurumaUrl from '../node_modules/vscode-oniguruma/release/onig.wasm?url'

let onigurumaLib: Promise<textmate.IOnigLib> | undefined
async function getOnigLib() {
	if (!onigurumaLib) {
		onigurumaLib = (async () => {
			const response = await fetch(onigurumaUrl)
			return oniguruma.loadWASM(response).then<textmate.IOnigLib>(() => ({
        createOnigScanner: (patterns) => new oniguruma.OnigScanner(patterns),
        createOnigString: (s) => new oniguruma.OnigString(s),
      }))
		})()
	}
	return onigurumaLib
}

type TokenData = {
  text: string,
  settings: Record<string, string>,
}

type Props = {
	text: string,
	grammar: string,
	theme: textmate.IRawTheme,
}

export function GrammarPreview({ text, grammar, theme }: Props) {
	const [loadedGrammar, setLoadedGrammar] = useState<textmate.IGrammar>()
  const [colormap, setColormap] = useState<string[]>()

  useEffect(() => {
		const registry = new textmate.Registry({
			onigLib: getOnigLib(),
			loadGrammar: async (scopeName) => {
				if (scopeName === 'source.mcfunction') {
					return textmate.parseRawGrammar(grammar)
				}
				return null
			},
			theme: theme,
		})
		registry.loadGrammar('source.mcfunction').then(loadedGrammar => {
			setLoadedGrammar(loadedGrammar ?? undefined)
		})
		const colormap = registry.getColorMap()
		colormap[1] = '#ffffff'
		colormap[2] = '#000000'
		setColormap(colormap)
		return () => registry.dispose()
  }, [grammar])

  const [tokens, setTokens] = useState<TokenData[][]>()

  useEffect(() => {
    if (!loadedGrammar || !colormap) return
    let ruleStack = textmate.INITIAL;
    const tokens: TokenData[][] = []
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i]
      const lineData: TokenData[] = []
      const lineTokens = loadedGrammar.tokenizeLine2(line, ruleStack)
      let prevIndex = lineTokens.tokens[0]
      for (let j = 1; j < lineTokens.tokens.length; j += 2) {
        const metadata = lineTokens.tokens[j]
        const nextIndex = lineTokens.tokens[j+1]
        const text = line.substring(prevIndex, nextIndex)
        const foreground = colormap[(metadata & 0b00000000111111111000000000000000) >>> 15]
        lineData.push({ text, settings: { foreground } })
        prevIndex = nextIndex
      }
      ruleStack = lineTokens.ruleStack
      tokens.push(lineData)
    }
    setTokens(tokens)
  }, [loadedGrammar, text])

	return <>
		{tokens?.map(line => <div class="w-full">
			{line.map(token => <span style={`color: ${token.settings.foreground};`}>
				{token.text}
			</span>)}
			&#8203;
		</div>)}
	</>
}

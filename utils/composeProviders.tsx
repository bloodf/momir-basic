import type { PropsWithChildren, ReactNode } from 'react';

type ProviderComponent = (props: PropsWithChildren<object>) => ReactNode;

export function composeProviders(providers: ProviderComponent[]): ProviderComponent {
  return function ComposedProviders({ children }: PropsWithChildren<object>) {
    return providers.reduceRight<ReactNode>(
      (accumulator, Provider) => <Provider>{accumulator}</Provider>,
      children,
    );
  };
}

/**
 * RTL-aware styled components utilities
 */

import styled, { css } from 'styled-components';

export type Direction = 'rtl' | 'ltr';

interface RTLProps {
  $direction?: Direction;
}

/**
 * RTL-aware margin utilities
 */
export const marginLeft = (value: string) => css<RTLProps>`
  ${({ $direction = 'rtl' }) =>
    $direction === 'rtl'
      ? css`margin-right: ${value};`
      : css`margin-left: ${value};`}
`;

export const marginRight = (value: string) => css<RTLProps>`
  ${({ $direction = 'rtl' }) =>
    $direction === 'rtl'
      ? css`margin-left: ${value};`
      : css`margin-right: ${value};`}
`;

/**
 * RTL-aware padding utilities
 */
export const paddingLeft = (value: string) => css<RTLProps>`
  ${({ $direction = 'rtl' }) =>
    $direction === 'rtl'
      ? css`padding-right: ${value};`
      : css`padding-left: ${value};`}
`;

export const paddingRight = (value: string) => css<RTLProps>`
  ${({ $direction = 'rtl' }) =>
    $direction === 'rtl'
      ? css`padding-left: ${value};`
      : css`padding-right: ${value};`}
`;

/**
 * RTL-aware border utilities
 */
export const borderLeft = (value: string) => css<RTLProps>`
  ${({ $direction = 'rtl' }) =>
    $direction === 'rtl'
      ? css`border-right: ${value};`
      : css`border-left: ${value};`}
`;

export const borderRight = (value: string) => css<RTLProps>`
  ${({ $direction = 'rtl' }) =>
    $direction === 'rtl'
      ? css`border-left: ${value};`
      : css`border-right: ${value};`}
`;

/**
 * RTL-aware positioning utilities
 */
export const left = (value: string) => css<RTLProps>`
  ${({ $direction = 'rtl' }) =>
    $direction === 'rtl'
      ? css`right: ${value};`
      : css`left: ${value};`}
`;

export const right = (value: string) => css<RTLProps>`
  ${({ $direction = 'rtl' }) =>
    $direction === 'rtl'
      ? css`left: ${value};`
      : css`right: ${value};`}
`;

/**
 * RTL-aware text alignment
 */
export const textAlign = css<RTLProps>`
  ${({ $direction = 'rtl' }) =>
    $direction === 'rtl'
      ? css`text-align: right;`
      : css`text-align: left;`}
`;

/**
 * RTL-aware flex direction
 */
export const flexDirection = (direction: 'row' | 'row-reverse') => css<RTLProps>`
  ${({ $direction: dir = 'rtl' }) => {
    if (dir === 'rtl') {
      return direction === 'row'
        ? css`flex-direction: row-reverse;`
        : css`flex-direction: row;`;
    }
    return css`flex-direction: ${direction};`;
  }}
`;

/**
 * RTL-aware transform for icons
 */
export const rtlTransform = css<RTLProps>`
  ${({ $direction = 'rtl' }) =>
    $direction === 'rtl'
      ? css`transform: scaleX(-1);`
      : css`transform: none;`}
`;

/**
 * Base RTL container
 */
export const RTLContainer = styled.div<RTLProps>`
  direction: ${({ $direction = 'rtl' }) => $direction};
  text-align: ${({ $direction = 'rtl' }) => ($direction === 'rtl' ? 'right' : 'left')};
  font-family: ${({ $direction = 'rtl' }) =>
    $direction === 'rtl'
      ? "'Vazirmatn', 'Tahoma', 'Arial', sans-serif"
      : "'Inter', 'Helvetica', 'Arial', sans-serif"};
`;

/**
 * RTL-aware input field
 */
export const RTLInput = styled.input<RTLProps>`
  direction: ${({ $direction = 'rtl' }) => $direction};
  text-align: ${({ $direction = 'rtl' }) => ($direction === 'rtl' ? 'right' : 'left')};
  
  &::placeholder {
    text-align: ${({ $direction = 'rtl' }) => ($direction === 'rtl' ? 'right' : 'left')};
  }
`;

/**
 * RTL-aware textarea
 */
export const RTLTextarea = styled.textarea<RTLProps>`
  direction: ${({ $direction = 'rtl' }) => $direction};
  text-align: ${({ $direction = 'rtl' }) => ($direction === 'rtl' ? 'right' : 'left')};
  
  &::placeholder {
    text-align: ${({ $direction = 'rtl' }) => ($direction === 'rtl' ? 'right' : 'left')};
  }
`;

/**
 * RTL-aware button with icon
 */
export const RTLButton = styled.button<RTLProps & { $hasIcon?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  ${({ $direction = 'rtl', $hasIcon }) =>
    $hasIcon && $direction === 'rtl'
      ? css`flex-direction: row-reverse;`
      : css`flex-direction: row;`}
  
  svg {
    ${({ $direction = 'rtl' }) =>
      $direction === 'rtl'
        ? css`transform: scaleX(-1);`
        : css`transform: none;`}
  }
`;

/**
 * RTL-aware dropdown/select
 */
export const RTLSelect = styled.select<RTLProps>`
  direction: ${({ $direction = 'rtl' }) => $direction};
  text-align: ${({ $direction = 'rtl' }) => ($direction === 'rtl' ? 'right' : 'left')};
  
  option {
    direction: ${({ $direction = 'rtl' }) => $direction};
    text-align: ${({ $direction = 'rtl' }) => ($direction === 'rtl' ? 'right' : 'left')};
  }
`;

/**
 * RTL-aware card component
 */
export const RTLCard = styled.div<RTLProps>`
  ${paddingLeft('1rem')}
  ${paddingRight('1rem')}
  ${borderLeft('1px solid #e5e7eb')}
  
  &:first-child {
    ${({ $direction = 'rtl' }) =>
      $direction === 'rtl'
        ? css`border-right: none;`
        : css`border-left: none;`}
  }
`;

/**
 * RTL-aware navigation item
 */
export const RTLNavItem = styled.div<RTLProps>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  ${({ $direction = 'rtl' }) =>
    $direction === 'rtl'
      ? css`flex-direction: row-reverse;`
      : css`flex-direction: row;`}
  
  ${paddingLeft('1rem')}
  ${paddingRight('1rem')}
  
  svg {
    ${rtlTransform}
  }
`;

/**
 * RTL-aware table cell
 */
export const RTLTableCell = styled.td<RTLProps>`
  ${textAlign}
  ${paddingLeft('0.75rem')}
  ${paddingRight('0.75rem')}
  
  &:first-child {
    ${({ $direction = 'rtl' }) =>
      $direction === 'rtl'
        ? css`padding-right: 1.5rem;`
        : css`padding-left: 1.5rem;`}
  }
  
  &:last-child {
    ${({ $direction = 'rtl' }) =>
      $direction === 'rtl'
        ? css`padding-left: 1.5rem;`
        : css`padding-right: 1.5rem;`}
  }
`;

/**
 * RTL-aware form group
 */
export const RTLFormGroup = styled.div<RTLProps>`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  
  label {
    ${textAlign}
    font-weight: 500;
  }
  
  input, textarea, select {
    direction: ${({ $direction = 'rtl' }) => $direction};
    text-align: ${({ $direction = 'rtl' }) => ($direction === 'rtl' ? 'right' : 'left')};
  }
`;

/**
 * RTL-aware modal header
 */
export const RTLModalHeader = styled.div<RTLProps>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  ${({ $direction = 'rtl' }) =>
    $direction === 'rtl'
      ? css`flex-direction: row-reverse;`
      : css`flex-direction: row;`}
  
  ${paddingLeft('1.5rem')}
  ${paddingRight('1.5rem')}
  padding-top: 1rem;
  padding-bottom: 1rem;
  ${borderLeft('1px solid #e5e7eb')}
`;

/**
 * Utility function to create RTL-aware styled component
 */
export const createRTLComponent = <T extends keyof JSX.IntrinsicElements>(
  element: T
) => styled(element)<RTLProps>`
  direction: ${({ $direction = 'rtl' }) => $direction};
  text-align: ${({ $direction = 'rtl' }) => ($direction === 'rtl' ? 'right' : 'left')};
`;
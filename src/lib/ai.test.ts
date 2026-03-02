import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateBriefCard, deterministicFallback, resetGenAI } from './ai';
import { GoogleGenAI } from '@google/genai';

// Mock the GoogleGenAI module
vi.mock('@google/genai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@google/genai')>();
  return {
    ...actual,
    GoogleGenAI: vi.fn(),
  };
});

describe('AI Integration: generateBriefCard', () => {
  const mockIntelItems = [
    {
      id: 'item-1',
      external_id: 'CVE-2024-1234',
      title: 'Critical Vulnerability in ExampleCorp',
      content: 'A critical vulnerability has been found in ExampleCorp products allowing remote code execution.',
      url: 'https://example.com/cve-2024-1234'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    resetGenAI();
    // Set a dummy API key so getGenAI doesn't throw
    process.env.GEMINI_API_KEY = 'dummy-key';
  });

  it('should return a validated BriefCard on successful Gemini response', async () => {
    const mockValidResponse = {
      title: 'ExampleCorp RCE Vulnerability',
      summaryBullets: ['Critical RCE found in ExampleCorp.', 'Patch immediately.'],
      whyItMatters: 'This affects all enterprise customers.',
      confidence: 'HIGH',
      citations: [
        { id: 'CVE-2024-1234', title: 'Critical Vulnerability in ExampleCorp', url: 'https://example.com/cve-2024-1234' }
      ]
    };

    const generateContentMock = vi.fn().mockResolvedValue({
      text: JSON.stringify(mockValidResponse)
    });

    // Setup the mock instance
    vi.mocked(GoogleGenAI).mockImplementation(function() {
      return {
        models: {
          generateContent: generateContentMock
        }
      } as any;
    });

    const result = await generateBriefCard(mockIntelItems);

    expect(generateContentMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockValidResponse);
  });

  it('should fallback to deterministic summarization on Zod validation failure', async () => {
    const mockInvalidResponse = {
      title: 'Missing fields',
      // Missing summaryBullets, whyItMatters, confidence, citations
    };

    const generateContentMock = vi.fn().mockResolvedValue({
      text: JSON.stringify(mockInvalidResponse)
    });

    vi.mocked(GoogleGenAI).mockImplementation(function() {
      return {
        models: {
          generateContent: generateContentMock
        }
      } as any;
    });

    const result = await generateBriefCard(mockIntelItems);

    expect(generateContentMock).toHaveBeenCalledTimes(1);
    
    // It should match the deterministic fallback
    const expectedFallback = deterministicFallback(mockIntelItems);
    expect(result).toEqual(expectedFallback);
    expect(result.title).toContain('[Fallback]');
    expect(result.citations[0].id).toBe('CVE-2024-1234');
  });

  it('should fallback to deterministic summarization on API error', async () => {
    const generateContentMock = vi.fn().mockRejectedValue(new Error('API Rate Limit Exceeded'));

    vi.mocked(GoogleGenAI).mockImplementation(function() {
      return {
        models: {
          generateContent: generateContentMock
        }
      } as any;
    });

    const result = await generateBriefCard(mockIntelItems);

    expect(generateContentMock).toHaveBeenCalledTimes(1);
    
    const expectedFallback = deterministicFallback(mockIntelItems);
    expect(result).toEqual(expectedFallback);
  });
});

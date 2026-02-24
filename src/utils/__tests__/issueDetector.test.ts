import { describe, it, expect } from 'vitest';
import { detectIssues } from '../issueDetector.js';

describe('detectIssues', () => {
  it('returns empty array for clean page', () => {
    const html = '<html><body><p>Normal content here.</p></body></html>';
    expect(detectIssues(html)).toEqual([]);
  });

  describe('paywall detection', () => {
    it('detects paywall by CSS class', () => {
      const html = '<html><body><div class="paywall">Subscribe!</div></body></html>';
      const issues = detectIssues(html);
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('paywall');
      expect(issues[0].message).toContain('element: .paywall');
    });

    it('detects paywall by class wildcard', () => {
      const html = '<html><body><div class="my-paywall-overlay">Blocked</div></body></html>';
      const issues = detectIssues(html);
      expect(issues.some(i => i.type === 'paywall')).toBe(true);
    });

    it('detects paywall by data attribute', () => {
      const html = '<html><body><div data-paywall="true">Content locked</div></body></html>';
      const issues = detectIssues(html);
      expect(issues.some(i => i.type === 'paywall')).toBe(true);
    });

    it('detects paywall message in button', () => {
      const html = '<html><body><button>Subscribe to continue reading</button></body></html>';
      const issues = detectIssues(html);
      expect(issues.some(i => i.type === 'paywall')).toBe(true);
    });

    it('detects paywall message in modal', () => {
      const html = '<html><body><div class="modal">This article is for subscribers</div></body></html>';
      const issues = detectIssues(html);
      expect(issues.some(i => i.type === 'paywall')).toBe(true);
    });

    it('does not false-positive on normal "subscribe" in body text', () => {
      const html = '<html><body><p>You can subscribe to our newsletter for updates.</p></body></html>';
      expect(detectIssues(html)).toEqual([]);
    });
  });

  describe('login detection', () => {
    it('detects login form by action', () => {
      const html = '<html><body><form action="/login"><input type="text"/></form></body></html>';
      const issues = detectIssues(html);
      expect(issues.some(i => i.type === 'login_required')).toBe(true);
      expect(issues[0].message).toContain('login form detected');
    });

    it('detects login form by class', () => {
      const html = '<html><body><form class="login-form"><input type="text"/></form></body></html>';
      const issues = detectIssues(html);
      expect(issues.some(i => i.type === 'login_required')).toBe(true);
    });

    it('detects login required message in body text', () => {
      const html = '<html><body><p>Please log in to access this content</p></body></html>';
      const issues = detectIssues(html);
      expect(issues.some(i => i.type === 'login_required')).toBe(true);
      expect(issues[0].message).toContain('please log in');
    });

    it('detects multiple login links', () => {
      const html = `<html><body>
        <a href="/login">Log in</a>
        <a href="/signin">Sign in</a>
        <a href="/auth/login">Login here</a>
        <a href="/user/signin">Sign in now</a>
      </body></html>`;
      const issues = detectIssues(html);
      expect(issues.some(i => i.type === 'login_required' && i.message.includes('multiple login links'))).toBe(true);
    });
  });

  describe('partial content detection', () => {
    it('detects content gate button', () => {
      const html = '<html><body><button>Continue reading</button></body></html>';
      const issues = detectIssues(html);
      expect(issues.some(i => i.type === 'partial_content')).toBe(true);
      expect(issues[0].message).toContain('content gate detected');
    });

    it('detects gate element with class', () => {
      const html = '<html><body><div class="content-gate">Subscribe to read</div></body></html>';
      const issues = detectIssues(html);
      expect(issues.some(i => i.type === 'partial_content')).toBe(true);
    });

    it('detects truncated content structure', () => {
      const html = '<html><body><div class="truncated-content">...</div></body></html>';
      const issues = detectIssues(html);
      expect(issues.some(i => i.type === 'partial_content')).toBe(true);
      expect(issues[0].message).toContain('truncated content structure detected');
    });

    it('does not false-positive on normal "read more" link', () => {
      const html = '<html><body><a href="/article">Read more</a></body></html>';
      expect(detectIssues(html)).toEqual([]);
    });
  });

  describe('combined issues', () => {
    it('can detect multiple issue types on the same page', () => {
      const html = `<html><body>
        <div class="paywall">Blocked</div>
        <form action="/login"><input/></form>
        <button>Continue reading</button>
      </body></html>`;
      const issues = detectIssues(html);
      const types = issues.map(i => i.type);
      expect(types).toContain('paywall');
      expect(types).toContain('login_required');
      expect(types).toContain('partial_content');
    });
  });
});

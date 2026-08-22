import { 
  SocialPlatform, 
  SocialPublisherAdapter, 
  PublishPackage, 
  SocialConnection, 
  SocialPublisherResult, 
  PublishingValidationResult 
} from '../../types/publishing';
import { validatePublishPackage } from '../publishingValidationService';

/**
 * Generador de ID y URLs de simulación deterministas (MOCK)
 */
function generateMockPublishResult(platform: SocialPlatform, _pkg?: PublishPackage): SocialPublisherResult {
  const mockId = `mock_${platform}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const mockUrl = `https://mock.aurasocial.local/${platform}/${mockId}`;

  return {
    success: true,
    externalPostId: mockId,
    externalPostUrl: mockUrl,
    publishedAt: new Date().toISOString(),
  };
}

/**
 * Adaptador Mock para Instagram (Reels & Feed)
 */
export class MockInstagramPublisher implements SocialPublisherAdapter {
  platform: SocialPlatform = 'instagram';

  async validatePackage(pkg: PublishPackage): Promise<PublishingValidationResult> {
    return validatePublishPackage(pkg);
  }

  async publish(pkg: PublishPackage, _connection?: SocialConnection | null): Promise<SocialPublisherResult> {
    const validation = await this.validatePackage(pkg);
    if (!validation.isValid) {
      return {
        success: false,
        errorCode: 'VALIDATION_FAILED',
        errorMessage: validation.errors.map(e => e.message).join(' | '),
      };
    }

    return generateMockPublishResult('instagram', pkg);
  }
}

/**
 * Adaptador Mock para Facebook (Feed & Video)
 */
export class MockFacebookPublisher implements SocialPublisherAdapter {
  platform: SocialPlatform = 'facebook';

  async validatePackage(pkg: PublishPackage): Promise<PublishingValidationResult> {
    return validatePublishPackage(pkg);
  }

  async publish(pkg: PublishPackage, _connection?: SocialConnection | null): Promise<SocialPublisherResult> {
    const validation = await this.validatePackage(pkg);
    if (!validation.isValid) {
      return {
        success: false,
        errorCode: 'VALIDATION_FAILED',
        errorMessage: validation.errors.map(e => e.message).join(' | '),
      };
    }

    return generateMockPublishResult('facebook', pkg);
  }
}

/**
 * Adaptador Mock para TikTok
 */
export class MockTikTokPublisher implements SocialPublisherAdapter {
  platform: SocialPlatform = 'tiktok';

  async validatePackage(pkg: PublishPackage): Promise<PublishingValidationResult> {
    return validatePublishPackage(pkg);
  }

  async publish(pkg: PublishPackage, _connection?: SocialConnection | null): Promise<SocialPublisherResult> {
    const validation = await this.validatePackage(pkg);
    if (!validation.isValid) {
      return {
        success: false,
        errorCode: 'VALIDATION_FAILED',
        errorMessage: validation.errors.map(e => e.message).join(' | '),
      };
    }

    return generateMockPublishResult('tiktok', pkg);
  }
}

/**
 * Adaptador Mock para YouTube (Shorts & Video)
 */
export class MockYouTubePublisher implements SocialPublisherAdapter {
  platform: SocialPlatform = 'youtube';

  async validatePackage(pkg: PublishPackage): Promise<PublishingValidationResult> {
    return validatePublishPackage(pkg);
  }

  async publish(pkg: PublishPackage, _connection?: SocialConnection | null): Promise<SocialPublisherResult> {
    const validation = await this.validatePackage(pkg);
    if (!validation.isValid) {
      return {
        success: false,
        errorCode: 'VALIDATION_FAILED',
        errorMessage: validation.errors.map(e => e.message).join(' | '),
      };
    }

    return generateMockPublishResult('youtube', pkg);
  }
}

/**
 * Adaptador Mock para LinkedIn
 */
export class MockLinkedInPublisher implements SocialPublisherAdapter {
  platform: SocialPlatform = 'linkedin';

  async validatePackage(pkg: PublishPackage): Promise<PublishingValidationResult> {
    return validatePublishPackage(pkg);
  }

  async publish(pkg: PublishPackage, _connection?: SocialConnection | null): Promise<SocialPublisherResult> {
    const validation = await this.validatePackage(pkg);
    if (!validation.isValid) {
      return {
        success: false,
        errorCode: 'VALIDATION_FAILED',
        errorMessage: validation.errors.map(e => e.message).join(' | '),
      };
    }

    return generateMockPublishResult('linkedin', pkg);
  }
}

/**
 * Registry de adaptadores por plataforma
 */
const adaptersRegistry: Record<SocialPlatform, SocialPublisherAdapter> = {
  instagram: new MockInstagramPublisher(),
  facebook: new MockFacebookPublisher(),
  tiktok: new MockTikTokPublisher(),
  youtube: new MockYouTubePublisher(),
  linkedin: new MockLinkedInPublisher(),
};

export function getPublisherAdapter(platform: SocialPlatform): SocialPublisherAdapter {
  const adapter = adaptersRegistry[platform];
  if (!adapter) {
    throw new Error(`No existe adaptador de publicación registrado para la plataforma '${platform}'.`);
  }
  return adapter;
}

import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common'
import { OrganizationsRepository } from './organizations.repository'
import {
  CreateOrganizationRequestDto,
  UpdateOrganizationRequestDto,
} from './dto/create-organization.dto'
import { Organization } from './classes/organization.class'
import { randomBytes } from 'crypto'
import {
  getSuperAdminACLKey,
  getNationalAdminACLKey,
  getOrganizationAdminACLKey,
  canUserAccessResource,
} from '../shared/acl'
import { RequestAdminUser } from '../shared/interfaces'

@Injectable()
export class OrganizationsService {
  constructor(private organizationsRepository: OrganizationsRepository) {}

  async createOneOrganization(
    createOrganizationRequestDto: CreateOrganizationRequestDto
  ): Promise<void> {
    // TODO @yashmurty : Check if user belongs to superAdmin or NationalAdmin.

    const randomCode = await this.generateUniqueOrganizationCode()

    createOrganizationRequestDto.organizationId = randomCode
    createOrganizationRequestDto.organizationCode = randomCode
    createOrganizationRequestDto.accessControlList = [
      getSuperAdminACLKey(),
      getNationalAdminACLKey(),
      getOrganizationAdminACLKey(randomCode),
    ]

    return this.organizationsRepository.createOne(createOrganizationRequestDto)
  }

  async findAllOrganizations(requestAdminUser: RequestAdminUser): Promise<Organization[]> {
    // ACL check is automatically performed in the repository function.
    return this.organizationsRepository.findAll(requestAdminUser.userAccessKey)
  }

  async findOneOrganizationById(
    requestAdminUser: RequestAdminUser,
    organizationId: string
  ): Promise<Organization> {
    // Fetch resource and perform ACL check.
    const organization = await this.organizationsRepository.findOneById(organizationId)
    if (!canUserAccessResource(requestAdminUser.userAccessKey, organization)) {
      throw new UnauthorizedException('User does not have access on this resource')
    }

    return organization
  }

  async updateOneOrganization(
    requestAdminUser: RequestAdminUser,
    updateOrganizationRequest: UpdateOrganizationRequestDto
  ): Promise<void> {
    // Fetch resource and perform ACL check.
    const organization = await this.organizationsRepository.findOneById(
      updateOrganizationRequest.organizationId
    )
    if (!canUserAccessResource(requestAdminUser.userAccessKey, organization)) {
      throw new UnauthorizedException('User does not have access on this resource')
    }

    return this.organizationsRepository.updateOne(updateOrganizationRequest)
  }

  /**
   * Checks if organization code/id provided is valid or not.
   * @param organizationId: string
   */
  async isOrganizationCodeValid(organizationId: string): Promise<boolean> {
    const organization = await this.organizationsRepository.findOneById(organizationId)
    if (!organization) {
      return false
    }
    // This is just a sanity check. Since organization id and code should always have same value.
    if (organizationId !== organization.organizationCode) {
      throw new BadRequestException('organization code does not match organization id')
    }

    return true
  }

  /**
   * Generates a random unique organization code.
   * Calls itself again in case the generated code is already being used.
   */
  private async generateUniqueOrganizationCode(): Promise<string> {
    const randomCode = randomBytes(4) // Creates a 8 (4*2) string code.
      .toString('hex') // Use hex to avoid special characters.
      .toUpperCase()

    const organization = await this.organizationsRepository.findOneById(randomCode)
    if (organization) {
      // If organization exists for this random code, run the generate function again.
      return this.generateUniqueOrganizationCode()
    }

    return randomCode
  }
}

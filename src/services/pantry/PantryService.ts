import CreateEditPantryDto from "../../models/dto/pantry/CreateEditPantryDto";
import { Pantry } from "../../models/entity/Pantry";
import PantryUser from "../../models/entity/PantryUser";
import User from "../../models/entity/User";
import { Exception } from "../../utils/exceptions/Exception";
import Status from "../../utils/statusCodes";

export interface IPantryService {
  /**
   *
   * @param pantryDto
   * @param user
   */
  create(pantryDto: CreateEditPantryDto, user: User): Promise<void>;

  /**
   *
   * @param pantryId
   * @param user
   */
  getPantry(pantryId: number, user: User): Promise<Pantry>;

  /**
   *
   * @param user
   */
  getPantries(user: User): Promise<Array<Pantry>>;
}

export class PantryService implements IPantryService {
  public async getPantries(user: User): Promise<Array<Pantry>> {
    const pantries = await Pantry.find({
      where: {
        createdBy: user.id
      },
      select: ["id", "name", "isShared", "createdAt"],
      order: {
        createdAt: "DESC"
      },
      join: {
        alias: "pantry",
        leftJoinAndSelect: {
          pantryItems: "pantry.pantryItems"
        }
      }
    });

    return pantries;
  }

  public async getPantry(pantryId: number, user: User): Promise<Pantry> {
    const pantry = await Pantry.findOne({
      where: {
        id: pantryId,
        createdBy: user.id
      },
      join: {
        alias: "pantry",
        leftJoinAndSelect: {
          homes: "pantry.pantryItems",
          homeType: "homes.item"
        }
      }
    });

    if (!pantry) {
      throw new Exception(Status.NotFound, ["Pantry not found."]);
    }

    return pantry;
  }

  public async create(
    pantryDto: CreateEditPantryDto,
    user: User
  ): Promise<void> {
    await this.isPantryUnique(pantryDto.name, user);

    const pantry = await Pantry.create({
      name: pantryDto.name,
      isShared: false,
      createdBy: user.id
    }).save();

    await PantryUser.create({
      userId: user.id,
      pantryId: pantry.id,
      isOwner: true,
      canRead: true,
      canWrite: true,
      createdBy: user.id
    }).save();
  }

  /**
   * @description - returns true if the pantry name is unique
   * @param name
   * @param user
   */
  private async isPantryUnique(name: string, user: User): Promise<void> {
    if (user.pantryUsers) {
      for (let pantryUser of user.pantryUsers) {
        const pantry = await Pantry.findOne({ id: pantryUser.pantryId });
        if (!pantry) {
          throw new Exception(Status.NotFound, [`Pantry (${name}) not found.`]);
        }

        if (pantry.name === name) {
          throw new Exception(Status.BadRequest, [
            `Pantry name must be unique.`
          ]);
        }
      }
    }
  }
}

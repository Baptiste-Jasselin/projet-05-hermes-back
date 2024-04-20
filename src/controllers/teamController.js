import postgresClient from '../models/postgresClient.js';
import messageService from '../services/message/messageService.js';

export default {
  // obtenir les ids des conversations pour un user fournis ainsi que le dernier le message.
  // GET /api/me/teams
  getTeams: async (req, res, next) => {
    const { user } = res.locals;
    try {
      const teams = await postgresClient.team.findMany({
        select: {
          id: true,
          ownerId: true,
          name: true,
          color: true,
          profilePictureUrl: true,
        },
        where: {
          users: {
            some: { id: user.id },
          },
        },
      });

      const roomsInfoById = {};
      await Promise.all(
        teams.map(async (team) => {
          const roomInfo = await messageService.getRoomInfo({
            roomType: 'team',
            roomId: team.id,
            userId: user.id,
          });
          roomsInfoById[team.id] = roomInfo;
        }),
      );
      return res.json(
        teams.map((team) => {
          const roomInfo = roomsInfoById[team.id];

          return {
            ...team,
            ...roomInfo,
          };
        }),
      );
    } catch (error) {
      return next({
        status: 500,
        message: 'Internal Server Error',
        error,
      });
    }
  },

  // Créer une équipe avec les utilisateurs fournis dans le body
  // POST /api/me/teams
  newTeam: async (req, res, next) => {
    const { user } = res.locals;

    // Todo: validate user input with Joi
    const { name, color, profilePictureUrl } = req.body;

    try {
      const team = await postgresClient.team.create({
        data: {
          name,
          profilePictureUrl,
          color,
          ownerId: user.id,
          users: { connect: { id: user.id } },
        },
      });
      return res.status(201).json({
        created: true,
        ...team,
      });
    } catch (error) {
      return next({
        status: 400,
        message: 'Bad request',
        error,
      });
    }
  },

  // Obtenir les données d'une équipe (id fourni), inclure les utilisateurs qui la compose
  // GET /api/me/teams/:team-id
  getOneTeam: async (req, res, next) => {
    const teamId = parseInt(req.params.id, 10);

    if (teamId.isNaN) {
      return next({
        status: 400,
        message: 'Invalidate parameter',
      });
    }

    try {
      const team = await postgresClient.team.findFirst({ where: { id: teamId } });
      if (!team) {
        return next({
          status: 404,
          message: 'Team not found',
        });
      }
      return res.status(200).json({ ...team });
    } catch (error) {
      return next({
        status: 500,
        message: 'Internal Server Error',
        error,
      });
    }
  },

  // Modifier une équipe (id fourni)
  // PATCH /api/me/teams/:team-id
  updateTeam: async (req, res, next) => {
    const { user } = res.locals;
    const teamId = parseInt(req.params.id, 10);

    // Todo: validate user input with Joi
    const { name, color, profilePictureUrl } = req.body;

    try {
      const updatedTeam = await postgresClient.team.update({
        where: {
          id: teamId,
          users: { some: { id: user.id } },
        },
        data: {
          name,
          profilePictureUrl,
          color,
          ownerId: user.id,
        },
      });
      return res.status(201).json({
        updated: true,
        ...updatedTeam,
      });
    } catch (error) {
      return next({
        status: 400,
        message: 'Bad request',
        error,
      });
    }
  },

  // Liste des utilisateurs de notre équipe. (id fourni)
  // GET /api/me/teams/:team-id/users
  getTeammates: async (req, res, next) => {
    const teamId = parseInt(req.params.id, 10);

    try {
      const teammates = await postgresClient.user.findMany({
        select: {
          id: true,
          email: true,
          firstname: true,
          lastname: true,
          rppsCode: true,
          profilePictureUrl: true,
        },
        where: { teams: { some: { id: teamId } } },
      });
      return res.status(200).json(teammates);
    } catch (error) {
      return next({
        status: 500,
        message: 'Internal Server Error',
        error,
      });
    }
  },

  // Ajoute un utilisateur à notre équipe.
  // POST /api/me/teams/:team-id/users/:user-id
  addTeammate: async (req, res, next) => {
    let { teamId, userId } = req.params;
    teamId = parseInt(teamId, 10);
    userId = parseInt(userId, 10);
    // console.log('teamId : ', teamId);
    // console.log('userId : ', userId);
    try {
      const updatedTeam = await postgresClient.team.update({
        where: { id: teamId },
        data: { users: { connect: { id: userId } } },
      });
      return res.status(201).json({
        added: true,
        userId,
        updatedTeam,
      });
    } catch (error) {
      return next({
        status: 400,
        message: 'Bad request',
        error,
      });
    }
  },

  // Enlève un utilisateur à notre équipe.
  // DELETE /api/me/teams/:team-id/users/:user-id
  removeTeammate: async (req, res, next) => {
    let { teamId, userId } = req.params;
    teamId = parseInt(teamId, 10);
    userId = parseInt(userId, 10);
    try {
      const updatedTeam = await postgresClient.team.update({
        where: { id: teamId },
        data: { users: { disconnect: { id: userId } } },
      });
      return res.status(200).json({
        deleted: true,
        userId,
        updatedTeam,
      });
    } catch (error) {
      return next({
        status: 400,
        message: 'Bad request',
        error,
      });
    }
  },
};

import { PrismaClient, Prisma } from '@prisma/client'
import { vendor_info_model } from './prisma/zod'

const vendor_info = vendor_info_model.safeParse({
})

const prisma = new PrismaClient()

if(vendor_info.success){
	prisma.vendor_info.create({
		data:vendor_info.data
	})	
}
